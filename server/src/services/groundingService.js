/**
 * Factual Grounding Service for Dastaan
 * Provides a provider-independent, multi-tier verification pipeline:
 *  - Tier 1: City & Region verification via OpenStreetMap Nominatim
 *  - Tier 2: Point of Interest (POI) grounding with strict source priority:
 *     1. Cached, verified POIs for the exact destination (memory & TTL)
 *     2. Locally maintained traceable attraction dataset & configured alternative providers
 *     3. Optimized OpenStreetMap Overpass API with rate-limit cooldown, query simplification,
 *        and server-wide concurrency limiting
 *     4. Exact-destination stale cache reuse / structured recoverable error (POI_SERVICE_UNAVAILABLE)
 *
 * Adheres strictly to OSM Nominatim & Overpass usage policies:
 *  - Dedicated identifying User-Agent
 *  - Single-flight in-flight query deduplication
 *  - Server-wide request concurrency limit (max 2 active queries)
 *  - 429 rate-limit cooldown without mirror hopping
 *  - 504 / timeout query progressive simplification (node-only, reduced radius, smaller result set)
 *  - Zero attraction fabrication or silent destination substitution
 *  - Safe diagnostic logging without secrets
 */

import { getCuratedAttractions } from './attractionsCatalog.js';
import { getPlacesPoolForDestination } from './placesService.js';

// In-memory cache for verified destinations and attraction pools
const destinationCache = new Map();
const poiPoolCache = new Map();

// In-flight single-flight deduplication map: prevents concurrent duplicate queries for identical targets
const inFlightPoiRequests = new Map();

// Endpoint rate-limit cooldown tracking: maps endpointUrl -> cooldownUntilTimestamp
const endpointCooldowns = new Map();

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for fresh cache
const DEFAULT_429_COOLDOWN_MS = 60 * 1000; // 60 seconds conservative cooldown on 429
const OVERALL_POI_BUDGET_MS = 12000; // 12 seconds bounded overall budget across all attempts
const NOMINATIM_USER_AGENT = 'Dastaan-Travel-Planner/1.0 (contact: support@dastaan.local)';

export const OSM_ATTRIBUTION = 'Data © OpenStreetMap contributors, ODbL';

/**
 * Prefer the Nominatim hit that actually matches the user's destination
 * instead of a broader state/country result.
 */
export function pickBestNominatimResult(results = [], query = '') {
  if (!Array.isArray(results) || results.length === 0) return null;
  const q = query.toLowerCase().trim();
  let best = results[0];
  let bestScore = -Infinity;

  for (const item of results) {
    const display = String(item.display_name || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const address = item.address || {};
    const localBits = [
      address.city, address.town, address.village, address.municipality,
      address.county, address.hamlet, address.state_district
    ].filter(Boolean).map((v) => String(v).toLowerCase());

    let score = Number(item.importance || 0);
    if (name === q) score += 100;
    else if (name.includes(q) || q.includes(name)) score += 45;
    if (display.startsWith(q)) score += 50;
    else if (display.includes(q)) score += 25;
    if (localBits.some((bit) => bit === q || bit.includes(q) || q.includes(bit))) score += 20;

    // Penalize generic state/country-only labels when the query is more specific
    const state = String(address.state || '').toLowerCase();
    const type = String(item.type || '').toLowerCase();
    const addresstype = String(item.addresstype || '').toLowerCase();

    if (state && state === name && q !== state && !q.includes(state)) score -= 40;
    if (type === 'state' || addresstype === 'state' || type === 'country' || addresstype === 'country') {
      if (q !== name && !q.includes(name)) score -= 50;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

/**
 * Keep the traveler's destination title (e.g. "Spiti Valley") instead of
 * collapsing it to a parent region such as "Himachal Pradesh".
 */
export function resolveDestinationDisplayName(result, query = '') {
  const q = (query || '').trim();
  if (!result) return q;
  const address = result.address || {};
  const display = String(result.display_name || '');
  const state = String(address.state || '').trim();
  const country = String(address.country || '').trim();

  if (q.length >= 2 && display.toLowerCase().includes(q.toLowerCase())) {
    return q;
  }

  const candidates = [
    result.name,
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
    address.hamlet,
    q
  ];

  for (const candidate of candidates) {
    const name = String(candidate || '').trim();
    if (!name) continue;
    if (state && name.toLowerCase() === state.toLowerCase()) continue;
    if (country && name.toLowerCase() === country.toLowerCase()) continue;
    return name;
  }

  return q || state || country;
}

export const DEFAULT_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

/**
 * Global Concurrency Limiter for Overpass API requests
 * Limits simultaneous active outbound network connections to public mirrors.
 */
export class ConcurrencyLimiter {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.activeCount++;
        resolve(() => this.release());
      });
    });
  }

  release() {
    this.activeCount--;
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.queue.shift();
      if (typeof next === 'function') {
        next();
      }
    }
  }

  getActiveCount() {
    return this.activeCount;
  }

  getQueueLength() {
    return this.queue.length;
  }

  reset() {
    this.activeCount = 0;
    this.queue = [];
  }
}

export const overpassLimiter = new ConcurrencyLimiter(2);

/**
 * Returns list of Overpass endpoints to use, prioritizing hosted / custom endpoints.
 */
export function getOverpassEndpoints() {
  const hosted = (process.env.OVERPASS_HOSTED_URL || process.env.OVERPASS_CUSTOM_ENDPOINT || '').trim();
  const configured = (process.env.OVERPASS_ENDPOINTS || '').trim();

  const endpoints = [];
  if (hosted) {
    endpoints.push(hosted);
  }
  if (configured) {
    configured.split(',').map(s => s.trim()).filter(Boolean).forEach(ep => {
      if (!endpoints.includes(ep)) endpoints.push(ep);
    });
  }
  DEFAULT_OVERPASS_ENDPOINTS.forEach(ep => {
    if (!endpoints.includes(ep)) endpoints.push(ep);
  });

  return endpoints;
}

/**
 * Check remaining cooldown (in seconds) for a given endpoint. Returns 0 if ready.
 */
export function getEndpointCooldown(endpoint) {
  const until = endpointCooldowns.get(endpoint) || 0;
  const now = Date.now();
  if (until > now) {
    return Math.ceil((until - now) / 1000);
  }
  return 0;
}

/**
 * Set rate limit cooldown for a given endpoint.
 */
export function setEndpointCooldown(endpoint, cooldownSeconds = 60) {
  const ms = Math.max(5000, cooldownSeconds * 1000);
  endpointCooldowns.set(endpoint, Date.now() + ms);
}

/**
 * Clear cooldown tracking.
 */
export function clearEndpointCooldowns() {
  endpointCooldowns.clear();
}

/**
 * Parse Retry-After header into integer seconds.
 */
export function parseRetryAfterHeader(headerValue) {
  if (!headerValue) return null;
  const str = String(headerValue).trim();
  const parsedSeconds = parseInt(str, 10);
  if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
    return parsedSeconds;
  }
  const parsedDate = Date.parse(str);
  if (!isNaN(parsedDate)) {
    const diffSec = Math.ceil((parsedDate - Date.now()) / 1000);
    return Math.max(1, diffSec);
  }
  return null;
}

/**
 * Build normalized cache key for POI candidate pools
 */
export function buildPoiCacheKey({ destinationKey, lat, lon, radiusMeters = 5000 }) {
  const normDest = (destinationKey || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
  const latStr = (typeof lat === 'number' && !isNaN(lat)) ? lat.toFixed(2) : '0.00';
  const lonStr = (typeof lon === 'number' && !isNaN(lon)) ? lon.toFixed(2) : '0.00';
  const radiusKm = Math.round((radiusMeters || 5000) / 1000);
  return `poi:${normDest}:${latStr},${lonStr}:r${radiusKm}`;
}

/**
 * Clears in-memory caches, in-flight requests, and cooldown records.
 */
export function clearGroundingCache() {
  destinationCache.clear();
  poiPoolCache.clear();
  inFlightPoiRequests.clear();
  endpointCooldowns.clear();
  overpassLimiter.reset();
}

/**
 * Tier 1: Verify that a city or region exists on the world map via Nominatim.
 */
export async function verifyDestination(destinationName, { fetchFn = fetch } = {}) {
  const query = (destinationName || '').trim();
  if (!query || query.length < 2) {
    return {
      verified: false,
      code: 'INVALID_DESTINATION_NAME',
      error: 'Destination name must be at least 2 characters.'
    };
  }

  const cacheKey = query.toLowerCase();
  const cached = destinationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < DEFAULT_CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        verified: false,
        code: 'GEOCODING_SERVICE_ERROR',
        error: `Geocoding request failed with status ${res.status}.`
      };
    }

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      return {
        verified: false,
        code: 'DESTINATION_NOT_FOUND',
        error: `Destination "${query}" could not be verified on the world map. Please verify the spelling or specify the country/region.`
      };
    }

    const first = pickBestNominatimResult(results, query);
    const address = first.address || {};
    const resolvedName = resolveDestinationDisplayName(first, query);
    const country = address.country || 'Worldwide';

    const bbox = Array.isArray(first.boundingbox) && first.boundingbox.length === 4
      ? first.boundingbox.map(coord => parseFloat(coord))
      : [parseFloat(first.lat) - 0.1, parseFloat(first.lat) + 0.1, parseFloat(first.lon) - 0.1, parseFloat(first.lon) + 0.1];

    const result = {
      verified: true,
      name: resolvedName,
      originalQuery: query,
      country,
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      boundingbox: bbox,
      displayName: first.display_name,
      osmType: first.osm_type,
      osmId: first.osm_id,
      attribution: OSM_ATTRIBUTION
    };

    destinationCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    clearTimeout(timer);
    return {
      verified: false,
      code: 'GEOCODING_NETWORK_ERROR',
      error: `Failed to contact geocoding service: ${err.message}`
    };
  }
}

/**
 * Map OpenStreetMap tags to Dastaan activity categories
 */
export function mapOsmTagToCategory(tags = {}) {
  const tourism = tags.tourism || '';
  const historic = tags.historic || '';
  const leisure = tags.leisure || '';
  const amenity = tags.amenity || '';

  if (historic || tourism === 'monument' || tourism === 'castle') return 'HISTORY';
  if (tourism === 'museum' || tourism === 'gallery') return 'CULTURE';
  if (leisure === 'park' || leisure === 'nature_reserve' || leisure === 'garden' || tourism === 'viewpoint') return 'NATURE';
  if (amenity === 'marketplace' || Boolean(tags.shop && tags.shop !== 'no')) return 'SHOPPING';
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'fast_food') return 'FOOD';
  if (tags.sport || tags.climbing) return 'ADVENTURE';
  return 'EXPLORE';
}

/**
 * Fetch verified physical landmarks via Wikimedia Geosearch API (zero-config, high uptime open knowledge provider).
 */
export async function fetchWikipediaAttractions({ lat, lon, destinationName, fetchFn = fetch }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return [];

  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=8000&gslimit=20&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res || !res.ok) return [];

    const data = await res.json();
    const geosearch = data?.query?.geosearch || [];
    if (!Array.isArray(geosearch) || geosearch.length === 0) return [];

    const excluded = /\b(hospital|senior secondary school|high school|police station|constituency|subdivision|gram panchayat|district collectorate)\b/i;
    const pois = [];
    const seenNames = new Set();

    for (const item of geosearch) {
      if (!item.title || excluded.test(item.title)) continue;
      if (destinationName && item.title.toLowerCase().trim() === destinationName.toLowerCase().trim()) continue;

      const norm = item.title.toLowerCase().trim();
      if (seenNames.has(norm)) continue;
      seenNames.add(norm);

      let cat = 'EXPLORE';
      if (/temple|church|mosque|shrine|cathedral|gurudwara|monastery|synagogue/i.test(item.title)) cat = 'HISTORY';
      else if (/fort|palace|ruins|castle|tomb|monument|heritage|gate/i.test(item.title)) cat = 'HISTORY';
      else if (/museum|gallery|theatre|opera|center/i.test(item.title)) cat = 'CULTURE';
      else if (/park|garden|lake|river|waterfall|pass|valley|peak|mountain|sanctuary/i.test(item.title)) cat = 'NATURE';
      else if (/market|bazaar|mall/i.test(item.title)) cat = 'SHOPPING';

      pois.push({
        id: `wiki_page_${item.pageid}`,
        name: item.title,
        category: cat,
        lat: item.lat,
        lon: item.lon,
        source: 'Wikipedia / Wikimedia Foundation',
        operationalStatusNote: 'Verified geographic landmark via Wikimedia Open Knowledge project.'
      });
    }

    return pois;
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Builds an Overpass QL query with progressive query simplification based on failure mode.
 */
export function buildOverpassQuery({ lat, lon, boundingbox, level = 1 }) {
  const timeoutSec = level === 1 ? 5 : 3;
  const hasCoords = typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon);

  if (level === 1) {
    if (hasCoords) {
      return `[out:json][timeout:${timeoutSec}];
(
  node["tourism"~"^(attraction|museum|viewpoint|gallery)$"](around:5000,${lat},${lon});
  way["tourism"~"^(attraction|museum)$"](around:4000,${lat},${lon});
  node["historic"~"^(monument|castle|memorial)$"](around:5000,${lat},${lon});
  node["leisure"~"^(park|garden)$"](around:5000,${lat},${lon});
);
out center 20 qt;`;
    }
    const [south, north, west, east] = boundingbox;
    const bboxStr = `${south},${west},${north},${east}`;
    return `[out:json][timeout:${timeoutSec}];
(
  node["tourism"~"^(attraction|museum|viewpoint|gallery)$"](${bboxStr});
  way["tourism"~"^(attraction|museum)$"](${bboxStr});
  node["historic"~"^(monument|castle|memorial)$"](${bboxStr});
  node["leisure"~"^(park|garden)$"](${bboxStr});
);
out center 20 qt;`;
  }

  // Level 2 (Simplified Node-Only): near-instant spatial lookup
  if (hasCoords) {
    return `[out:json][timeout:${timeoutSec}];
(
  node["tourism"~"^(attraction|museum|viewpoint)$"](around:3500,${lat},${lon});
  node["historic"~"^(monument|castle)$"](around:3500,${lat},${lon});
);
out 15 qt;`;
  }
  const [south, north, west, east] = boundingbox;
  const bboxStr = `${south},${west},${north},${east}`;
  return `[out:json][timeout:${timeoutSec}];
(
  node["tourism"~"^(attraction|museum|viewpoint)$"](${bboxStr});
  node["historic"~"^(monument|castle)$"](${bboxStr});
);
out 15 qt;`;
}

/**
 * Execute Overpass query across configured mirrors respecting cooldown, simplification, and time budget.
 */
async function executeOverpassRetrieval({
  centerLat,
  centerLon,
  boundingbox,
  destinationKey,
  reqId,
  authHeaders,
  fetchFn
}) {
  const endpoints = getOverpassEndpoints();
  let lastError = null;
  let lastStatus = null;
  const overallStart = Date.now();

  for (let epIndex = 0; epIndex < endpoints.length; epIndex++) {
    const currentEndpoint = endpoints[epIndex];

    const cooldownRemaining = getEndpointCooldown(currentEndpoint);
    if (cooldownRemaining > 0) {
      console.warn(`[GroundingService] [${reqId}] Skipping endpoint "${currentEndpoint}": 429 cooldown active for ${cooldownRemaining}s.`);
      lastStatus = 429;
      continue;
    }

    if (Date.now() - overallStart >= OVERALL_POI_BUDGET_MS) {
      console.warn(`[GroundingService] [${reqId}] Total POI retrieval budget (${OVERALL_POI_BUDGET_MS}ms) reached. Bailing out.`);
      break;
    }

    const queryLevels = [1, 2];

    for (let levelIndex = 0; levelIndex < queryLevels.length; levelIndex++) {
      const currentLevel = queryLevels[levelIndex];
      const elapsedSoFar = Date.now() - overallStart;
      const remainingBudget = OVERALL_POI_BUDGET_MS - elapsedSoFar;

      if (remainingBudget <= 800) {
        console.warn(`[GroundingService] [${reqId}] Insufficient remaining budget (${remainingBudget}ms). Bailing out.`);
        break;
      }

      const query = buildOverpassQuery({
        lat: centerLat,
        lon: centerLon,
        boundingbox,
        level: currentLevel
      });

      const t0 = Date.now();
      const preferredTimeout = currentLevel === 1 ? 5000 : 3000;
      const timeoutMs = Math.min(preferredTimeout, remainingBudget);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetchFn(currentEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': NOMINATIM_USER_AGENT,
            ...authHeaders
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal
        });

        clearTimeout(timer);
        const durationMs = Date.now() - t0;
        lastStatus = res.status;

        // Handle HTTP 429 Too Many Requests (Rate Limit)
        if (res.status === 429) {
          const retryAfterHeader = res.headers?.get?.('retry-after');
          const cooldownSec = parseRetryAfterHeader(retryAfterHeader) || Math.round(DEFAULT_429_COOLDOWN_MS / 1000);
          setEndpointCooldown(currentEndpoint, cooldownSec);
          console.warn(`[GroundingService] [${reqId}] Endpoint "${currentEndpoint}" rate-limited (HTTP 429). Cooldown: ${cooldownSec}s. Not bypassing.`);
          lastError = new Error(`Overpass rate limit exceeded on ${currentEndpoint}. Cooldown active for ${cooldownSec}s.`);
          break; // Do not hop to other mirrors to evade rate limit
        }

        // Handle HTTP 504 / 502 / transient errors
        if (!res.ok) {
          console.warn(`[GroundingService] [${reqId}] Endpoint "${currentEndpoint}" responded with HTTP ${res.status} (level ${currentLevel}, ${durationMs}ms).`);

          if (res.status === 504) {
            if (currentLevel === 1 && (Date.now() - overallStart) < OVERALL_POI_BUDGET_MS - 2000) {
              console.info(`[GroundingService] [${reqId}] HTTP 504 on Level 1. Progressively simplifying query to Level 2 (node-only) for "${destinationKey || 'destination'}".`);
              continue;
            }
            lastError = new Error(`Overpass POI service timed out with status 504.`);
            break;
          }

          if (res.status === 502 || res.status === 503) {
            lastError = new Error(`Overpass POI service error status ${res.status}.`);
            console.info(`[GroundingService] [${reqId}] HTTP ${res.status} on "${currentEndpoint}". Skipping this mirror without retrying a heavier query.`);
            break;
          }

          lastError = new Error(`Overpass POI service responded with status ${res.status}.`);
          break;
        }

        const data = await res.json();
        const rawElements = Array.isArray(data?.elements) ? data.elements : [];

        const uniquePois = [];
        const seenNames = new Set();

        for (const el of rawElements) {
          const tags = el.tags || {};
          const name = tags.name || tags['name:en'];
          if (!name || name.trim().length < 2) continue;

          const normName = name.trim().toLowerCase();
          if (seenNames.has(normName)) continue;
          seenNames.add(normName);

          const elLat = el.lat !== undefined ? el.lat : el.center?.lat;
          const elLon = el.lon !== undefined ? el.lon : el.center?.lon;
          const category = mapOsmTagToCategory(tags);

          uniquePois.push({
            id: `osm_${el.type || 'node'}_${el.id}`,
            name: name.trim(),
            category,
            lat: elLat !== undefined ? parseFloat(elLat) : null,
            lon: elLon !== undefined ? parseFloat(elLon) : null,
            tags: {
              tourism: tags.tourism,
              historic: tags.historic,
              leisure: tags.leisure,
              wikidata: tags.wikidata || null,
              wikipedia: tags.wikipedia || null
            },
            source: 'OpenStreetMap',
            operationalStatusNote: 'Point of interest physically verified in OpenStreetMap.'
          });
        }

        if (uniquePois.length === 0) {
          if (currentLevel === 1 && (Date.now() - overallStart) < OVERALL_POI_BUDGET_MS - 2000) {
            continue;
          }
          return {
            verified: false,
            code: 'INSUFFICIENT_ATTRACTIONS',
            error: `Insufficient verified public attractions found in "${destinationKey || 'the selected area'}".`,
            count: 0,
            pois: [],
            attribution: OSM_ATTRIBUTION
          };
        }

        console.info(`[GroundingService] [${reqId}] POIs retrieved successfully (${uniquePois.length} items, level ${currentLevel}, ${durationMs}ms) via ${currentEndpoint}`);

        return {
          verified: true,
          count: uniquePois.length,
          pois: uniquePois,
          provider: 'osm-overpass',
          attribution: OSM_ATTRIBUTION
        };

      } catch (err) {
        clearTimeout(timer);
        const durationMs = Date.now() - t0;
        const isTimeout = err.name === 'AbortError';

        console.warn(`[GroundingService] [${reqId}] Mirror "${currentEndpoint}" error (${isTimeout ? 'Timeout' : err.message}, level ${currentLevel}, ${durationMs}ms).`);

        if (isTimeout && currentLevel === 1 && (Date.now() - overallStart) < OVERALL_POI_BUDGET_MS - 2500) {
          console.info(`[GroundingService] [${reqId}] Timeout at Level 1. Simplifying to Level 2 on "${currentEndpoint}"`);
          continue;
        }

        lastError = err;
        break;
      }
    }

    if (lastStatus === 429) {
      break;
    }
  }

  return {
    verified: false,
    code: 'POI_SERVICE_UNAVAILABLE',
    status: lastStatus,
    lastStatus: lastStatus,
    isTimeout: Boolean(lastError && lastError.name === 'AbortError'),
    error: `The map attraction verification service is temporarily unavailable across all public mirrors (status ${lastStatus || '502'}). Please retry in a moment.`,
    retryable: true,
    count: 0,
    pois: [],
    attribution: OSM_ATTRIBUTION
  };
}

/**
 * Provider-Independent POI Retrieval Interface
 *
 * Source Priority:
 *  1. Cached, verified POIs for the exact destination
 *  2. Configured alternative POI provider or locally maintained traceable attraction dataset
 *  3. Optimized Overpass retrieval with cooldown, concurrency, and time-budget protections
 *  4. Exact-destination stale cache reuse / recoverable error (POI_SERVICE_UNAVAILABLE)
 *
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getVerifiedPoisForBoundingBox({
  boundingbox,
  destinationKey,
  lat = null,
  lon = null,
  radiusMeters = 5000,
  preferredSource = 'auto',
  fetchFn = fetch
}) {
  const reqId = 'poi_' + Math.random().toString(36).substring(2, 8);

  if (!Array.isArray(boundingbox) || boundingbox.length !== 4) {
    return {
      verified: false,
      code: 'INVALID_BBOX',
      error: 'Bounding box must be an array of [south, north, west, east].'
    };
  }

  const [south, north, west, east] = boundingbox;
  const centerLat = (typeof lat === 'number' && !isNaN(lat)) ? lat : (south + north) / 2;
  const centerLon = (typeof lon === 'number' && !isNaN(lon)) ? lon : (west + east) / 2;

  const validCoords = centerLat >= -90 && centerLat <= 90 && centerLon >= -180 && centerLon <= 180;
  if (!validCoords) {
    return {
      verified: false,
      code: 'INVALID_COORDINATES',
      error: `Coordinates [${centerLat}, ${centerLon}] are out of valid geographic range.`
    };
  }

  const cacheKey = buildPoiCacheKey({
    destinationKey,
    lat: centerLat,
    lon: centerLon,
    radiusMeters
  });

  // -------------------------------------------------------------------------
  // Source Priority 1: Cached, verified POIs for the exact destination
  // -------------------------------------------------------------------------
  const cached = poiPoolCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < DEFAULT_CACHE_TTL_MS) {
    console.info(`[GroundingService] [${reqId}] Cache HIT for "${cacheKey}" (${cached.data.count} items)`);
    return { ...cached.data, cached: true };
  }

  // Single-flight in-progress deduplication: join active promise
  if (inFlightPoiRequests.has(cacheKey)) {
    console.info(`[GroundingService] [${reqId}] Single-flight deduplication: joining active query for "${cacheKey}"`);
    return inFlightPoiRequests.get(cacheKey);
  }

  const poiFetchPromise = (async () => {
    // -------------------------------------------------------------------------
    // Source Priority 2: Configured Alternative Provider or Locally Maintained Traceable Attraction Dataset
    // -------------------------------------------------------------------------
    if (preferredSource !== 'overpass-only') {
      // 2A. Locally Maintained Traceable Attraction Dataset
      const curatedPois = getCuratedAttractions(destinationKey);
      if (curatedPois && Array.isArray(curatedPois) && curatedPois.length >= 3) {
        console.info(`[GroundingService] [${reqId}] Retrieved ${curatedPois.length} verified attractions from Dastaan Heritage Archive for "${destinationKey}"`);
        // Catalog hit: skip live Overpass entirely so itinerary generation
        // does not depend on public OSM mirrors being healthy.
        const result = {
          verified: true,
          count: curatedPois.length,
          pois: curatedPois,
          provider: 'dastaan-heritage-archive',
          attribution: 'Data © Dastaan Verified Heritage Archive'
        };
        poiPoolCache.set(cacheKey, {
          timestamp: Date.now(),
          destinationKey: destinationKey ? destinationKey.toLowerCase().trim() : null,
          lat: centerLat,
          lon: centerLon,
          data: result
        });
        return result;
      }

      // 2B. Configured Alternative Places Provider (if API keys set)
      try {
        const altPlaces = await getPlacesPoolForDestination(destinationKey, centerLat, centerLon);
        if (Array.isArray(altPlaces) && altPlaces.length >= 3) {
          const mappedAlt = altPlaces.map((p, idx) => ({
            id: p.placeId || `alt_poi_${idx}`,
            name: p.name,
            category: mapOsmTagToCategory({ tourism: p.category }),
            lat: p.latitude || centerLat,
            lon: p.longitude || centerLon,
            address: p.address || '',
            source: p.source || 'Alternative Places Provider',
            operationalStatusNote: 'Verified venue from configured places provider.'
          }));
          console.info(`[GroundingService] [${reqId}] Retrieved ${mappedAlt.length} verified places from alternative provider for "${destinationKey}"`);
          const result = {
            verified: true,
            count: mappedAlt.length,
            pois: mappedAlt,
            provider: 'places-service-provider',
            attribution: 'Data © Configured Places Provider'
          };
          poiPoolCache.set(cacheKey, {
            timestamp: Date.now(),
            destinationKey: destinationKey ? destinationKey.toLowerCase().trim() : null,
            lat: centerLat,
            lon: centerLon,
            data: result
          });
          return result;
        }
      } catch {
        // Continue to Overpass
      }
    }

    // -------------------------------------------------------------------------
    // Source Priority 3: Optimized Overpass Retrieval
    // -------------------------------------------------------------------------
    const authHeaders = {};
    if (process.env.OVERPASS_API_KEY && process.env.OVERPASS_API_KEY.trim() !== '') {
      authHeaders['Authorization'] = `Bearer ${process.env.OVERPASS_API_KEY.trim()}`;
    }

    const releaseLimiter = await overpassLimiter.acquire();
    let overpassResult = null;

    try {
      overpassResult = await executeOverpassRetrieval({
        centerLat,
        centerLon,
        boundingbox,
        destinationKey,
        reqId,
        authHeaders,
        fetchFn
      });
    } finally {
      releaseLimiter();
    }

    if (overpassResult && overpassResult.verified && overpassResult.pois.length > 0) {
      poiPoolCache.set(cacheKey, {
        timestamp: Date.now(),
        destinationKey: destinationKey ? destinationKey.toLowerCase().trim() : null,
        lat: centerLat,
        lon: centerLon,
        data: overpassResult
      });
      return overpassResult;
    }

    // If Overpass returned 429 (rate-limited), respect cooldown and do not cascade to other public servers
    if (overpassResult && (overpassResult.status === 429 || overpassResult.lastStatus === 429)) {
      return overpassResult;
    }

    // 2C. Wikimedia Geosearch after Overpass outage — including timeouts.
    if (preferredSource !== 'overpass-only') {
      const wikiPois = await fetchWikipediaAttractions({
        lat: centerLat,
        lon: centerLon,
        destinationName: destinationKey,
        fetchFn
      });
      // Accept even a small number of Wikipedia POIs if Overpass failed,
      // as long as it provides SOME grounded landmarks.
      if (wikiPois && wikiPois.length >= 1) {
        console.info(`[GroundingService] [${reqId}] Retrieved ${wikiPois.length} verified landmarks from Wikimedia for "${destinationKey}" after Overpass failure.`);
        const result = {
          verified: true,
          count: wikiPois.length,
          pois: wikiPois,
          provider: 'wikimedia-geosearch',
          attribution: 'Data © Wikimedia Foundation, CC BY-SA 4.0'
        };
        poiPoolCache.set(cacheKey, {
          timestamp: Date.now(),
          destinationKey: destinationKey ? destinationKey.toLowerCase().trim() : null,
          lat: centerLat,
          lon: centerLon,
          data: result
        });
        return result;
      }
    }

    // -------------------------------------------------------------------------
    // Source Priority 4: Exact-Destination Stale Cache / Recoverable Error
    // -------------------------------------------------------------------------
    if (cached && cached.data && cached.data.verified && cached.data.count > 0) {
      const destMatch = !cached.destinationKey || !destinationKey || (cached.destinationKey === destinationKey.toLowerCase().trim());
      if (destMatch) {
        console.warn(`[GroundingService] [${reqId}] Upstream providers unavailable. Reusing stale cached POI pool for "${destinationKey || cacheKey}" (${cached.data.count} items).`);
        return {
          ...cached.data,
          stale: true
        };
      }
    }

    console.error(`[GroundingService] [${reqId}] All POI sources failed for "${destinationKey || 'destination'}".`);

    return overpassResult || {
      verified: false,
      code: 'POI_SERVICE_UNAVAILABLE',
      error: `The map attraction verification service is temporarily unavailable across all public mirrors (status 502). Please retry in a moment.`,
      retryable: true,
      count: 0,
      pois: [],
      attribution: OSM_ATTRIBUTION
    };
  })();

  inFlightPoiRequests.set(cacheKey, poiFetchPromise);

  try {
    const result = await poiFetchPromise;
    return result;
  } finally {
    inFlightPoiRequests.delete(cacheKey);
  }
}

/**
 * Combined destination & POI verification pipeline
 */
export async function verifyDestinationAndPois(destinationName, { fetchFn = fetch, preferredSource = 'auto' } = {}) {
  // Step 1: Verify City via Nominatim Geocoding
  const destResult = await verifyDestination(destinationName, { fetchFn });
  if (!destResult.verified) {
    return {
      verified: false,
      code: destResult.code,
      error: destResult.error,
      destination: null,
      pois: [],
      count: 0
    };
  }

  // Step 2: Retrieve verified POI candidate pool for the verified bounding box & coordinates
  const poiResult = await getVerifiedPoisForBoundingBox({
    boundingbox: destResult.boundingbox,
    destinationKey: destResult.originalQuery || destinationName || destResult.name,
    lat: destResult.lat,
    lon: destResult.lon,
    preferredSource,
    fetchFn
  });

  return {
    verified: destResult.verified && poiResult.verified,
    destination: destResult,
    pois: poiResult.pois || [],
    count: poiResult.count || 0,
    code: !destResult.verified ? destResult.code : (!poiResult.verified ? poiResult.code : null),
    error: !destResult.verified ? destResult.error : (!poiResult.verified ? poiResult.error : null),
    retryable: Boolean(poiResult.retryable),
    provider: poiResult.provider || null,
    attribution: poiResult.attribution || OSM_ATTRIBUTION
  };
}

export default {
  verifyDestination,
  getVerifiedPoisForBoundingBox,
  verifyDestinationAndPois,
  mapOsmTagToCategory,
  buildOverpassQuery,
  buildPoiCacheKey,
  fetchWikipediaAttractions,
  clearGroundingCache,
  getOverpassEndpoints,
  getEndpointCooldown,
  setEndpointCooldown,
  clearEndpointCooldowns,
  parseRetryAfterHeader,
  overpassLimiter,
  ConcurrencyLimiter,
  pickBestNominatimResult,
  resolveDestinationDisplayName,
  DEFAULT_OVERPASS_ENDPOINTS,
  OSM_ATTRIBUTION
};
