import http from 'http';
import https from 'https';
import TravelCache from '../models/TravelCache.js';

/**
 * Average urban speeds (km/h) for routing estimations
 */
const SPEED_KMH = {
  driving: 28, // Average urban driving speed factoring lights and turns
  walking: 4.8  // Standard walking pace
};

/**
 * Urban road tortuosity factor (ratio of road network distance to great-circle line distance).
 * Empirical studies in urban planning show real road distance is typically ~1.30–1.40x Euclidean distance.
 */
const TORTUOSITY_FACTOR = {
  driving: 1.35,
  walking: 1.25
};

/**
 * Calculates Great-Circle (Haversine) distance in kilometers between two geographic coordinates.
 *
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Generates an honest estimate fallback route when upstream OSRM routing is unavailable,
 * rate-limited, or disconnected.
 *
 * @param {Array<{latitude: number, longitude: number, name?: string}>} waypoints
 * @param {'driving'|'walking'} mode
 * @returns {object} Normalized route object
 */
export function generateEstimatedRoute(waypoints, mode = 'driving') {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return {
      distanceKm: 0,
      durationMin: 0,
      mode,
      provider: 'none',
      isEstimated: false,
      geometry: { type: 'LineString', coordinates: [] },
      legs: [],
      sourceLabel: 'Travel Data Unavailable',
      note: 'Fewer than two waypoints provided.'
    };
  }

  let totalDistKm = 0;
  const legs = [];
  const coords = [];
  const tortuosity = TORTUOSITY_FACTOR[mode] || 1.35;
  const speed = SPEED_KMH[mode] || 28;
  const sourceLabel = mode === 'walking'
    ? 'Geodesic Estimate (1.25x Walking Tortuosity)'
    : 'Geodesic Estimate (1.35x Driving Tortuosity)';

  for (let i = 0; i < waypoints.length; i++) {
    const curr = waypoints[i];
    coords.push([curr.longitude, curr.latitude]);

    if (i > 0) {
      const prev = waypoints[i - 1];
      const directKm = haversineDistanceKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      const roadKm = Math.round(directKm * tortuosity * 100) / 100;
      const legDurationMin = Math.max(1, Math.round((roadKm / speed) * 60));

      totalDistKm += roadKm;
      legs.push({
        from: prev.name || `Waypoint ${i}`,
        to: curr.name || `Waypoint ${i + 1}`,
        distanceKm: roadKm,
        durationMin: legDurationMin,
        isEstimated: true,
        sourceLabel
      });
    }
  }

  const totalDurationMin = Math.max(1, Math.round((totalDistKm / speed) * 60));

  return {
    distanceKm: Math.round(totalDistKm * 10) / 10,
    durationMin: totalDurationMin,
    mode,
    provider: 'haversine-estimate',
    isEstimated: true,
    sourceLabel,
    geometry: {
      type: 'LineString',
      coordinates: coords
    },
    legs,
    note: 'Route calculated using geographic geodesic distance with urban road tortuosity factor. Upstream road network server was unconfigured, rate-limited, or unavailable.'
  };
}

/**
 * Internal helper to perform HTTP GET to OSRM demo server
 */
function fetchJson(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'DastaanTravelPlanner/2.0 (Evaluation; Contact: dev@dastaan.local)',
          Accept: 'application/json'
        },
        timeout: timeoutMs
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error(`Invalid JSON from routing provider: ${err.message}`));
            }
          } else {
            reject(new Error(`Routing provider returned HTTP status ${res.statusCode}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Routing provider request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Calculates a genuine road network route for ordered waypoints using OSRM,
 * with automatic caching in MongoDB TravelCache and graceful Haversine fallback.
 *
 * @param {Array<{latitude: number, longitude: number, name?: string}>} waypoints
 * @param {'driving'|'walking'} mode
 * @returns {Promise<object>} Normalized route data
 */
export async function calculateRoute(waypoints, mode = 'driving') {
  // 1. Validation
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return {
      success: false,
      message: 'At least two waypoints with valid latitude and longitude are required to calculate a route.',
      route: null
    };
  }

  // Verify coordinates
  const validWaypoints = waypoints.filter(
    wp =>
      wp &&
      typeof wp.latitude === 'number' &&
      !isNaN(wp.latitude) &&
      wp.latitude >= -90 &&
      wp.latitude <= 90 &&
      typeof wp.longitude === 'number' &&
      !isNaN(wp.longitude) &&
      wp.longitude >= -180 &&
      wp.longitude <= 180
  );

  if (validWaypoints.length < 2) {
    return {
      success: false,
      message: 'Route calculation requires at least two waypoints with valid numeric latitude and longitude.',
      route: null
    };
  }

  const routingMode = mode === 'walking' ? 'walking' : 'driving';

  // 2. Build Cache Key
  // e.g. route:driving:77.25,28.59;77.23,28.61
  const coordsHash = validWaypoints
    .map(wp => `${wp.longitude.toFixed(4)},${wp.latitude.toFixed(4)}`)
    .join(';');
  const cacheKey = `route:${routingMode}:${coordsHash}`;

  // 3. Check MongoDB Cache (30-day TTL)
  const cached = await TravelCache.getFresh(cacheKey);
  if (cached && cached.data) {
    return {
      success: true,
      route: {
        ...cached.data,
        cached: true
      }
    };
  }

  // 4. Call OSRM Road Network Routing Engine
  const osrmCoords = validWaypoints
    .map(wp => `${wp.longitude},${wp.latitude}`)
    .join(';');

  const osrmBaseUrl = process.env.OSRM_API_URL || 'http://router.project-osrm.org';
  const osrmUrl = `${osrmBaseUrl}/route/v1/${routingMode}/${osrmCoords}?overview=full&geometries=geojson&steps=false`;

  try {
    const data = await fetchJson(osrmUrl, 4500);

    if (data && data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
      const bestRoute = data.routes[0];
      const distKm = Math.round((bestRoute.distance / 1000) * 10) / 10;
      
      // Calculate realistic duration in minutes:
      // OSRM walking speeds can be aggressive, so we ensure walking paces are human-realistic
      let durationMin = Math.round(bestRoute.duration / 60);
      if (routingMode === 'walking' && distKm > 0) {
        const minWalkingMin = Math.round((distKm / 4.8) * 60);
        durationMin = Math.max(durationMin, minWalkingMin);
      }

      // Format legs
      const legs = (bestRoute.legs || []).map((leg, idx) => ({
        from: validWaypoints[idx]?.name || `Stop ${idx + 1}`,
        to: validWaypoints[idx + 1]?.name || `Stop ${idx + 2}`,
        distanceKm: Math.round((leg.distance / 1000) * 10) / 10,
        durationMin: Math.max(1, Math.round(leg.duration / 60)),
        isEstimated: false,
        sourceLabel: 'Road Network (OSRM)'
      }));

      const normalizedRoute = {
        distanceKm: distKm,
        durationMin: Math.max(1, durationMin),
        mode: routingMode,
        provider: 'osrm',
        isEstimated: false,
        sourceLabel: 'Road Network (OSRM)',
        cached: false,
        geometry: bestRoute.geometry || {
          type: 'LineString',
          coordinates: validWaypoints.map(w => [w.longitude, w.latitude])
        },
        legs,
        attribution: 'OpenStreetMap contributors / OSRM Project (BSD-2-Clause)'
      };

      // Persist to MongoDB TravelCache (30 days TTL = 2,592,000s)
      await TravelCache.setWithTTL(cacheKey, 'routing', 'osrm', normalizedRoute, 2592000);

      return {
        success: true,
        route: normalizedRoute
      };
    }
  } catch (err) {
    console.warn(`[RoutingService] OSRM upstream routing failed (${err.message}). Activating Haversine fallback.`);
  }

  // 5. Fallback: Honest Haversine Geodesic calculation
  const estimated = generateEstimatedRoute(validWaypoints, routingMode);

  // Cache fallback for 24 hours so we don't spam a failing upstream server repeatedly
  await TravelCache.setWithTTL(cacheKey, 'routing', 'haversine-estimate', estimated, 86400);

  return {
    success: true,
    route: estimated
  };
}

/**
 * Calculates routing between activities for a single itinerary day.
 *
 * @param {Array<{title: string, latitude?: number, longitude?: number}>} activities
 * @param {'driving'|'walking'} mode
 * @returns {Promise<object>} Route object
 */
export async function calculateDayRoute(activities, mode = 'driving') {
  if (!Array.isArray(activities) || activities.length < 2) {
    return {
      distanceKm: 0,
      durationMin: 0,
      mode,
      provider: 'none',
      isEstimated: false,
      geometry: { type: 'LineString', coordinates: [] },
      legs: []
    };
  }

  const waypoints = activities
    .filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number')
    .map(a => ({
      name: a.title,
      latitude: a.latitude,
      longitude: a.longitude
    }));

  if (waypoints.length < 2) {
    return {
      distanceKm: 0,
      durationMin: 0,
      mode,
      provider: 'insufficient-coordinates',
      isEstimated: false,
      geometry: { type: 'LineString', coordinates: [] },
      legs: [],
      sourceLabel: 'Travel Data Unavailable',
      note: 'Not enough activities in this day have valid coordinates to calculate routing.'
    };
  }

  const res = await calculateRoute(waypoints, mode);
  return res.route || generateEstimatedRoute(waypoints, mode);
}

export default {
  haversineDistanceKm,
  calculateRoute,
  calculateDayRoute,
  generateEstimatedRoute
};
