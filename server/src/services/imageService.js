import TravelCache from '../models/TravelCache.js';
import { CURATED_DESTINATIONS } from './destinationService.js';
import { haversineDistanceKm } from './routingService.js';

/**
 * Normalizes text to a clean URL/cache slug
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generic fetch with AbortController timeout protection
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DastaanTravel/2.0 (contact: support@dastaan.travel)',
        ...(options.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Identifies whether an image URL is a generic stock photo or placeholder
 */
export function isGenericOrStockImage(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('image1.jpg') ||
    lower.includes('image2.jpg') ||
    lower.includes('image3.jpg') ||
    lower.includes('image4.jpg') ||
    lower.includes('photo-1500534623283-312aade485b7') || // generic valley
    lower.includes('photo-1516483638261-f4dbaf036963') || // cinque terre
    lower.includes('photo-1464822759023-fed622ff2c3b') || // mountain landscape
    lower.includes('photo-1506744038136-46273834b3fb') || // generic landscape
    lower.includes('photo-1507525428034-b723cf961d3e') || // generic beach
    lower.includes('photo-1472214103451-9374bd1c798e') || // generic scenic
    lower.includes('photo-1513694203232-719a280e022f') || // generic old town
    lower.includes('photo-1504674900247-0877df9cc836') || // generic food
    lower.includes('indiagate.jpg')
  );
}

/**
 * Dynamically resolves an authentic, contextually relevant hero image
 * for any destination worldwide from Wikipedia / Wikimedia Commons.
 *
 * @param {object} params
 * @param {string} params.name - Destination city or region name
 * @param {string} [params.country] - Country name
 * @param {string} [params.countryCode] - Country code
 * @param {number} [params.latitude] - Latitude
 * @param {number} [params.longitude] - Longitude
 * @returns {Promise<{ url: string, source: string, attribution: string, title?: string } | null>}
 */
export async function getDestinationHeroImage({ name, country, countryCode, latitude, longitude }) {
  if (!name || typeof name !== 'string') return null;

  const cleanName = name.trim();
  const slug = slugify(cleanName);
  const cacheKey = `image:dest:${slug}`;

  // 1. Check MongoDB Cache (14-day freshness)
  try {
    const cached = await TravelCache.getFresh(cacheKey);
    if (cached && cached.data?.url) {
      return cached.data;
    }
  } catch (err) {
    // Non-blocking cache lookup failure
  }

  // 2. Check Curated Popular Destinations for verified high-res photo
  const curatedMatch = CURATED_DESTINATIONS.find(
    (d) => d.id === slug || d.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (curatedMatch && curatedMatch.image && !isGenericOrStockImage(curatedMatch.image)) {
    const result = {
      url: curatedMatch.image,
      source: 'curated-destination-archive',
      attribution: `Dastaan Verified Archive: ${curatedMatch.name}`,
      title: curatedMatch.name
    };
    try {
      await TravelCache.setWithTTL(cacheKey, 'destination-image', 'curated-archive', result, 1209600);
    } catch {}
    return result;
  }

  // 3. Live Zero-Cost Provider: Wikimedia / Wikipedia Pageimages API
  try {
    // Strategy A: Direct Wikipedia article lookup by destination name
    let targetTitle = cleanName;
    let url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      targetTitle
    )}&prop=pageimages|description|coordinates&piprop=thumbnail|original&pithumbsize=1600&format=json&origin=*`;

    let res = await fetchWithTimeout(url, {}, 3500);
    let data = res.ok ? await res.json() : null;
    let page = Object.values(data?.query?.pages || {})[0];

    // Check if the direct page is a disambiguation page or lacks an image
    const isDisambiguation =
      page?.description && page.description.toLowerCase().includes('disambiguation');
    let imgUrl = !isDisambiguation ? (page?.thumbnail?.source || page?.original?.source) : null;

    // Strategy B: If direct lookup had no image, search Wikipedia with country context
    if (!imgUrl) {
      const searchQuery = country ? `${cleanName} ${country}` : cleanName;
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        searchQuery
      )}&gsrlimit=3&prop=pageimages|description|coordinates&piprop=thumbnail|original&pithumbsize=1600&format=json&origin=*`;

      res = await fetchWithTimeout(searchUrl, {}, 3500);
      data = res.ok ? await res.json() : null;
      const candidatePages = Object.values(data?.query?.pages || {});

      for (const candidate of candidatePages) {
        const desc = (candidate.description || '').toLowerCase();
        if (
          !desc.includes('disambiguation') &&
          !desc.includes('electoral') &&
          !desc.includes('crime') &&
          !desc.includes('murder')
        ) {
          const candidateImg = candidate.thumbnail?.source || candidate.original?.source;
          if (candidateImg) {
            page = candidate;
            imgUrl = candidateImg;
            break;
          }
        }
      }
    }

    if (imgUrl) {
      const result = {
        url: imgUrl,
        source: 'wikimedia-commons',
        attribution: `${page.title || cleanName} via Wikimedia Commons (CC BY-SA)`,
        title: page.title || cleanName,
        description: page.description || null
      };

      try {
        await TravelCache.setWithTTL(cacheKey, 'destination-image', 'wikimedia-commons', result, 1209600);
      } catch {}

      return result;
    }
  } catch (err) {
    console.warn(`[ImageService] Destination hero image lookup error for '${cleanName}':`, err.message);
  }

  // If no trustworthy matching image can be found, return null (neutral placeholder will be used)
  return null;
}

/**
 * Searches and returns an authentic photograph for a specific attraction or landmark.
 * Matches candidate results using attraction name, destination context, and metadata.
 *
 * @param {string} attractionName - Landmark or venue title
 * @param {string} [destinationName] - City or regional context
 * @param {object} [coords] - Optional geographic coordinates { latitude, longitude }
 * @returns {Promise<{ url: string, source: string, attribution: string, title?: string } | null>}
 */
export async function getAttractionPhoto(attractionName, destinationName = '', coords = {}) {
  if (!attractionName || typeof attractionName !== 'string') return null;

  const cleanAttr = attractionName.trim();
  const cleanDest = (destinationName || '').trim();
  const cacheKey = `image:attr:${slugify(cleanAttr)}:${slugify(cleanDest)}`;

  // 1. Check MongoDB Cache
  try {
    const cached = await TravelCache.getFresh(cacheKey);
    if (cached && cached.data?.url) {
      return cached.data;
    }
  } catch (err) {
    // Non-blocking cache lookup failure
  }

  // 2. Live Free Attraction Discovery via Wikipedia Generator Search
  try {
    const searchQuery = `${cleanAttr} ${cleanDest}`.trim();
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      searchQuery
    )}&gsrlimit=5&prop=pageimages|description|coordinates&piprop=thumbnail|original&pithumbsize=1000&format=json&origin=*`;

    const res = await fetchWithTimeout(searchUrl, {}, 3500);
    if (!res.ok) return null;

    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {});
    if (pages.length === 0) return null;

    // Filter and score candidates
    let bestPage = null;
    let highestScore = -1;

    const targetWords = cleanAttr.toLowerCase().split(/[\s,.-]+/).filter((w) => w.length > 2);
    const destLower = cleanDest.toLowerCase();

    for (const page of pages) {
      const pageTitle = (page.title || '').toLowerCase();
      const pageDesc = (page.description || '').toLowerCase();

      // Discard irrelevant categories
      if (
        pageDesc.includes('disambiguation') ||
        pageDesc.includes('murder') ||
        pageDesc.includes('crime') ||
        pageDesc.includes('electoral district') ||
        pageDesc.includes('album') ||
        pageDesc.includes('song') ||
        pageDesc.includes('politician')
      ) {
        continue;
      }

      const img = page.thumbnail?.source || page.original?.source;
      if (!img) continue;

      let score = 0;
      let matchedWords = 0;

      // Word match scoring with target attraction
      for (const word of targetWords) {
        if (pageTitle.includes(word)) {
          score += 3;
          matchedWords++;
        }
        if (pageDesc.includes(word)) score += 1;
      }

      // If attraction has distinct words but none matched the candidate title, skip
      if (targetWords.length > 0 && matchedWords === 0 && !pageTitle.includes(cleanAttr.toLowerCase())) {
        continue;
      }

      // Context scoring: Destination mentioned in description or title
      if (destLower && (pageDesc.includes(destLower) || pageTitle.includes(destLower))) {
        score += 4;
      }

      // Coordinate proximity scoring if available
      const pLat = page.coordinates?.[0]?.lat;
      const pLon = page.coordinates?.[0]?.lon;
      if (
        typeof coords?.latitude === 'number' &&
        typeof coords?.longitude === 'number' &&
        typeof pLat === 'number' &&
        typeof pLon === 'number'
      ) {
        const distKm = haversineDistanceKm(coords.latitude, coords.longitude, pLat, pLon);
        if (distKm > 80) {
          // Strictly reject geographically mismatched candidate (>80km from target context)
          continue;
        } else if (distKm <= 35) {
          score += 5; // Strong geographic confidence
        }
      }

      if (score > highestScore && score >= 2) {
        highestScore = score;
        bestPage = page;
      }
    }

    if (bestPage) {
      const imgUrl = bestPage.thumbnail?.source || bestPage.original?.source;
      if (imgUrl) {
        const result = {
          url: imgUrl,
          source: 'wikimedia-commons',
          attribution: `${bestPage.title} via Wikimedia Commons (CC BY-SA)`,
          title: bestPage.title,
          license: 'CC BY-SA 4.0'
        };

        try {
          await TravelCache.setWithTTL(cacheKey, 'attraction-image', 'wikimedia-commons', result, 1209600);
        } catch {}

        return result;
      }
    }
  } catch (err) {
    console.warn(`[ImageService] Attraction image lookup error for '${cleanAttr}':`, err.message);
  }

  return null;
}

/**
 * Enriches a list of activities with verified, authentic photographs.
 * Preserves existing authentic images, replaces generic stock placeholders,
 * and leaves missing images as null for clean neutral UI placeholders.
 *
 * @param {Array<object>} activities - List of activity objects
 * @param {string} destinationName - Context destination
 * @returns {Promise<Array<object>>} Enriched activities
 */
export async function enrichActivitiesWithAuthenticImages(activities, destinationName, destCoords = {}) {
  if (!Array.isArray(activities) || activities.length === 0) return [];

  return await Promise.all(
    activities.map(async (act) => {
      // 1. If activity already has an authentic, specific image, preserve it
      if (act.image && !isGenericOrStockImage(act.image)) {
        return act;
      }

      // 2. If activity has photoUrl that is authentic, use it
      if (act.photoUrl && !isGenericOrStockImage(act.photoUrl)) {
        return {
          ...act,
          image: act.photoUrl
        };
      }

      // 3. Query authentic image from live provider
      const coords = {
        latitude: typeof act.latitude === 'number' ? act.latitude : destCoords?.latitude,
        longitude: typeof act.longitude === 'number' ? act.longitude : destCoords?.longitude
      };
      const found = await getAttractionPhoto(act.title, destinationName, coords);

      if (found && found.url) {
        return {
          ...act,
          image: found.url,
          photoUrl: found.url,
          attribution: found.attribution || act.attribution,
          imageSource: found.source,
          license: found.license || 'CC BY-SA 4.0'
        };
      }

      // 4. No authentic match: set image to null rather than assigning an unrelated stock photo
      return {
        ...act,
        image: null,
        photoUrl: null
      };
    })
  );
}

export default {
  isGenericOrStockImage,
  getDestinationHeroImage,
  getAttractionPhoto,
  enrichActivitiesWithAuthenticImages
};
