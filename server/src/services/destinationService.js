import TravelCache from '../models/TravelCache.js';

/**
 * Curated destination catalog with verified coordinates and local imagery
 */
export const CURATED_DESTINATIONS = [
  {
    id: 'new-delhi',
    name: 'New Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.2090,
    admin1: 'Delhi',
    image: '/images/newdelhi/indiagate.jpg',
    defaultDur: 3,
    defaultBud: 8000,
    source: 'curated-popular'
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    country: 'India',
    countryCode: 'IN',
    latitude: 26.9124,
    longitude: 75.7873,
    admin1: 'Rajasthan',
    image: '/images/jaipur/amerfortandasheeshmahal.jpg',
    defaultDur: 3,
    defaultBud: 10000,
    source: 'curated-popular'
  },
  {
    id: 'manali',
    name: 'Manali',
    country: 'India',
    countryCode: 'IN',
    latitude: 32.2432,
    longitude: 77.1892,
    admin1: 'Himachal Pradesh',
    image: '/images/manali/rohtangpass.jpg',
    defaultDur: 3,
    defaultBud: 9000,
    source: 'curated-popular'
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.0116,
    longitude: 135.7681,
    admin1: 'Kyoto Prefecture',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
    defaultDur: 5,
    defaultBud: 30000,
    source: 'curated-popular'
  },
  {
    id: 'florence',
    name: 'Florence',
    country: 'Italy',
    countryCode: 'IT',
    latitude: 43.7696,
    longitude: 11.2558,
    admin1: 'Tuscany',
    image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80',
    defaultDur: 4,
    defaultBud: 25000,
    source: 'curated-popular'
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    countryCode: 'TR',
    latitude: 41.0082,
    longitude: 28.9784,
    admin1: 'Istanbul',
    image: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80',
    defaultDur: 4,
    defaultBud: 15000,
    source: 'curated-popular'
  },
  {
    id: 'mostar',
    name: 'Mostar',
    country: 'Bosnia & Herzegovina',
    countryCode: 'BA',
    latitude: 43.3438,
    longitude: 17.8078,
    admin1: 'Herzegovina-Neretva',
    image: 'https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80',
    defaultDur: 2,
    defaultBud: 5000,
    source: 'curated-popular'
  },
  {
    id: 'udaipur',
    name: 'Udaipur',
    country: 'India',
    countryCode: 'IN',
    latitude: 24.5854,
    longitude: 73.7125,
    admin1: 'Rajasthan',
    image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=1800&q=80',
    defaultDur: 4,
    defaultBud: 18000,
    source: 'curated-popular'
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    country: 'India',
    countryCode: 'IN',
    latitude: 30.0869,
    longitude: 78.2676,
    admin1: 'Uttarakhand',
    image: 'https://images.unsplash.com/photo-1545203144-79397492b239?auto=format&fit=crop&w=1800&q=80',
    defaultDur: 3,
    defaultBud: 12000,
    source: 'curated-popular'
  }
];

/**
 * Normalizes a raw geocoding entry into Dastaan's standard destination shape
 */
function normalizeDestination(raw, query) {
  const name = raw.name || 'Destination';
  const country = raw.country || '';
  const countryCode = (raw.country_code || '').toUpperCase();
  const slug = (name + (country ? `-${country}` : '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const isSouthAsia = ['IN', 'NP', 'LK', 'BT'].includes(countryCode);
  const defaultBud = isSouthAsia ? 12000 : 35000;
  const defaultDur = 4;

  const photoUrl = `https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80`;

  return {
    id: slug,
    name,
    country,
    countryCode,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : null,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : null,
    admin1: raw.admin1 || '',
    image: photoUrl,
    defaultDur,
    defaultBud,
    source: raw.source || 'open-meteo-geocoding'
  };
}

/**
 * Searches destinations with caching and live Open-Meteo Geocoding
 *
 * @param {string} query - Raw search term from user
 * @returns {Promise<{ destinations: Array, source: string, count: number }>}
 */
export async function searchDestinations(query = '') {
  const cleanQ = (query || '').trim();

  // If query is empty, return popular destinations
  if (!cleanQ) {
    return {
      destinations: CURATED_DESTINATIONS,
      source: 'curated-catalog',
      count: CURATED_DESTINATIONS.length
    };
  }

  const normalizedKey = cleanQ.toLowerCase();
  const cacheKey = `search:${normalizedKey}`;

  // 1. Check MongoDB Cache
  const cached = await TravelCache.getFresh(cacheKey);
  if (cached && Array.isArray(cached.data)) {
    return {
      destinations: cached.data,
      source: 'cache',
      provider: cached.provider,
      count: cached.data.length
    };
  }

  // 2. Identify local curated matches to prioritize
  const curatedMatches = CURATED_DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(normalizedKey) ||
      d.country.toLowerCase().includes(normalizedKey) ||
      d.id.toLowerCase().includes(normalizedKey)
  );

  // If exact curated match found, return immediately without network latency
  const exactMatch = CURATED_DESTINATIONS.find(
    (d) => d.id === normalizedKey || d.name.toLowerCase() === normalizedKey
  );
  if (exactMatch) {
    const results = [exactMatch, ...curatedMatches.filter((d) => d.id !== exactMatch.id)];
    return {
      destinations: results,
      source: 'curated-exact',
      provider: 'curated-popular',
      count: results.length
    };
  }

  // 3. Query Live Geocoding Provider (Open-Meteo Geocoding API - 100% free, no key required)
  let liveResults = [];
  let providerUsed = 'open-meteo';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cleanQ
    )}&count=10&language=en&format=json`;

    const response = await fetch(geoUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DastaanTravel/2.0'
      }
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results)) {
        liveResults = data.results.map((r) => normalizeDestination(r, cleanQ));
      }
    }
  } catch (err) {
    console.warn(`[DestinationService] Live geocoding query failed: ${err.message}`);
  }

  // 4. Merge results: Curated matches first, followed by live global results without duplicates
  const seenIds = new Set();
  const combined = [];

  for (const item of curatedMatches) {
    seenIds.add(item.id);
    combined.push(item);
  }

  for (const item of liveResults) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      combined.push(item);
    }
  }

  // 5. Cache result in MongoDB (24-hour TTL)
  if (combined.length > 0) {
    await TravelCache.setWithTTL(cacheKey, 'search', providerUsed, combined, 86400);
  }

  return {
    destinations: combined,
    source: liveResults.length > 0 ? 'live-provider' : 'curated-fallback',
    provider: providerUsed,
    count: combined.length
  };
}

/**
 * Look up a single destination by ID or Coordinates
 */
export async function getDestinationDetails(destinationId) {
  const cleanId = (destinationId || '').toLowerCase().trim();

  // 1. Check curated
  const curated = CURATED_DESTINATIONS.find((d) => d.id === cleanId || d.name.toLowerCase() === cleanId);
  if (curated) return curated;

  // 2. Search live provider
  const search = await searchDestinations(destinationId);
  return search.destinations[0] || null;
}
