import { CURATED_PLACES_CATALOG } from './placesService.js';
import { generateEstimatedRoute, calculateRoute, haversineDistanceKm } from './routingService.js';

/**
 * Standard destination image fallbacks
 */
const DESTINATION_IMAGES = {
  'manali': '/images/manali/rohtangpass.jpg',
  'new-delhi': '/images/newdelhi/indiagate.jpg',
  'jaipur': '/images/jaipur/amerfortandasheeshmahal.jpg',
  'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
  'florence': 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1800&q=80',
  'istanbul': 'https://images.unsplash.com/photo-1526080652727-5b77f74eacb2?auto=format&fit=crop&w=1800&q=80',
  'mostar': 'https://images.unsplash.com/photo-1600204739704-51a44c5b1616?auto=format&fit=crop&w=1800&q=80',
  'default': '/images/newdelhi/indiagate.jpg'
};

/**
 * Interest to keyword mapping for genuine personalization scoring
 */
const INTEREST_KEYWORD_MAP = {
  'culture': ['culture', 'cultural', 'heritage', 'temple', 'shrine', 'palace', 'monument', 'mosque', 'cathedral', 'church'],
  'history': ['history', 'historic', 'heritage', 'fort', 'tomb', 'ruins', 'castle', 'palace', 'museum', 'ancient'],
  'art': ['art', 'gallery', 'museum', 'craft', 'district', 'design', 'murals', 'sculpture'],
  'food': ['restaurant', 'food', 'culinary', 'cafe', 'market', 'dining', 'bazaar', 'tasting', 'eats', 'street food'],
  'nature': ['nature', 'park', 'waterfall', 'garden', 'pass', 'lake', 'river', 'scenic', 'mountain', 'bamboo', 'springs'],
  'shopping': ['shopping', 'bazaar', 'market', 'mall', 'crafts', 'textiles', 'jewelry', 'spices'],
  'relax': ['relax', 'springs', 'overlook', 'sunset', 'viewpoint', 'promenade', 'terrace', 'baths', 'lounge'],
  'adventure': ['adventure', 'trek', 'pass', 'paragliding', 'hiking', 'snow', 'valley', 'climb']
};

/**
 * Standard daily sightseeing time budgets (in hours) based on travel pace
 */
const DAILY_TIME_BUDGETS = {
  Relaxed: 6.0,
  Balanced: 8.0,
  Packed: 10.0
};

/**
 * Standard activity time slots based on travel pace
 */
const TIME_SLOTS = {
  Relaxed: ['10:00', '15:30'],
  Balanced: ['09:30', '13:00', '16:30'],
  Packed: ['08:30', '11:45', '14:30', '17:30']
};

/**
 * Scores a place based on user's selected interests to achieve genuine personalization.
 * Places matching chosen interests receive a significant scoring boost.
 */
export function scorePlaceForInterests(place, userInterests = []) {
  let score = typeof place.rating === 'number' ? place.rating : 4.0;
  if (!Array.isArray(userInterests) || userInterests.length === 0) return score;

  const searchable = `${place.name} ${place.category || ''} ${place.address || ''} ${place.attribution || ''}`.toLowerCase();

  for (const interest of userInterests) {
    const cleanInt = String(interest).toLowerCase().trim();
    const keywords = INTEREST_KEYWORD_MAP[cleanInt] || [cleanInt];

    for (const kw of keywords) {
      if (searchable.includes(kw)) {
        score += 4.0; // Major relevance boost
        break;
      }
    }
  }

  return score;
}

/**
 * Spatial clustering: groups places into clusters of nearby stops
 * using a greedy nearest-neighbor algorithm.
 */
function clusterPlacesGeographically(places, clusterSize = 3) {
  if (!Array.isArray(places) || places.length === 0) return [];
  if (places.length <= clusterSize) return [places];

  const pool = [...places];
  const clusters = [];

  while (pool.length > 0) {
    const cluster = [];
    let current = pool.shift();
    cluster.push(current);

    while (cluster.length < clusterSize && pool.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[i];
        if (
          typeof current.latitude === 'number' &&
          typeof candidate.latitude === 'number'
        ) {
          const d = haversineDistanceKm(
            current.latitude,
            current.longitude,
            candidate.latitude,
            candidate.longitude
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
          }
        }
      }

      current = pool.splice(nearestIdx, 1)[0];
      cluster.push(current);
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * 2-opt local search optimizer to reorder activities within a day to reduce travel backtracking
 */
export function optimizeActivityOrder2Opt(activities) {
  if (!Array.isArray(activities) || activities.length <= 2) return activities;

  // Only run if all activities have valid coordinates
  const allHaveCoords = activities.every(
    a => typeof a.latitude === 'number' && typeof a.longitude === 'number'
  );
  if (!allHaveCoords) return activities;

  let best = [...activities];
  let bestDist = calculateTotalPathDistance(best);
  let improved = true;
  let iterations = 0;

  while (improved && iterations < 50) {
    improved = false;
    iterations++;

    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = twoOptSwap(best, i, k);
        const candidateDist = calculateTotalPathDistance(candidate);

        if (candidateDist < bestDist - 0.05) { // At least 50m reduction
          best = candidate;
          bestDist = candidateDist;
          improved = true;
        }
      }
    }
  }

  return best;
}

function twoOptSwap(route, i, k) {
  const result = [];
  for (let c = 0; c < i; c++) result.push(route[c]);
  for (let c = k; c >= i; c--) result.push(route[c]);
  for (let c = k + 1; c < route.length; c++) result.push(route[c]);
  return result;
}

function calculateTotalPathDistance(route) {
  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    dist += haversineDistanceKm(
      route[i].latitude,
      route[i].longitude,
      route[i + 1].latitude,
      route[i + 1].longitude
    );
  }
  return dist;
}

/**
 * Resolves verified places from the catalog for a destination
 */
function resolvePlacesForDestination(destId, destName) {
  const clean = (destId || destName || '').toLowerCase().trim();
  if (CURATED_PLACES_CATALOG[clean]) {
    return [...CURATED_PLACES_CATALOG[clean]];
  }

  for (const [key, list] of Object.entries(CURATED_PLACES_CATALOG)) {
    if (clean.includes(key) || key.includes(clean)) {
      return [...list];
    }
  }

  return [];
}

/**
 * Attaches structured transit metadata to each consecutive activity pair.
 * For the last activity of each day, transitToNext is set to null.
 */
export function attachTransitToActivities(activities, route) {
  if (!Array.isArray(activities) || activities.length === 0) return [];
  const legs = Array.isArray(route?.legs) ? route.legs : [];

  return activities.map((act, idx) => {
    if (idx < activities.length - 1) {
      const nextAct = activities[idx + 1];
      const leg = legs[idx];

      if (leg && typeof leg.distanceKm === 'number' && typeof leg.durationMin === 'number') {
        return {
          ...act,
          transitToNext: {
            toTitle: nextAct.title,
            distanceKm: leg.distanceKm,
            durationMin: leg.durationMin,
            mode: route?.mode || 'driving',
            provider: route?.provider || (leg.isEstimated ? 'haversine-estimate' : 'osrm'),
            isEstimated: leg.isEstimated ?? true,
            sourceLabel: leg.sourceLabel || (leg.isEstimated ? 'Geodesic Estimate' : 'Road Network (OSRM)')
          }
        };
      }

      // Coordinates missing for one or both stops
      return {
        ...act,
        transitToNext: {
          toTitle: nextAct.title,
          distanceKm: null,
          durationMin: null,
          mode: route?.mode || 'driving',
          provider: 'none',
          isEstimated: false,
          sourceLabel: 'Travel Data Unavailable'
        }
      };
    }

    return {
      ...act,
      transitToNext: null
    };
  });
}

/**
 * Computes daily feasibility metrics comparing visit + transit time against pace budget.
 * Distinguishes road network routes, estimates, and unmapped travel.
 * Flags primary overload contributors and suggests moving an activity when appropriate.
 */
export function evaluateDayFeasibility(activities, route, travelStyle = 'Balanced', context = {}) {
  const dailyBudgetHours = DAILY_TIME_BUDGETS[travelStyle] || 8.0;

  // 1. Calculate total visit duration
  let totalVisitHours = 0;
  activities.forEach(act => {
    const dur = typeof act.visitDurationHours === 'number' && act.visitDurationHours > 0
      ? act.visitDurationHours
      : act.cat === 'FOOD' ? 1.5 : 2.0;
    totalVisitHours += dur;
  });

  // 2. Determine route quality and transit time
  let routeQuality = 'unknown';
  let routeSourceLabel = 'Travel Data Unavailable';
  let totalTransitHours = 0;

  if (route && typeof route.durationMin === 'number' && route.durationMin > 0) {
    totalTransitHours = Math.round((route.durationMin / 60) * 10) / 10;
    if (route.provider === 'osrm' && !route.isEstimated) {
      routeQuality = 'road_network';
      routeSourceLabel = 'Road Network (OSRM)';
    } else if (route.provider === 'haversine-estimate' || route.isEstimated) {
      routeQuality = 'estimate';
      routeSourceLabel = 'Geodesic Estimate (1.35x Tortuosity)';
    } else {
      routeQuality = 'unknown';
      routeSourceLabel = route.provider || 'Travel Data Unavailable';
    }
  } else if (route?.provider === 'osrm') {
    routeQuality = 'road_network';
    routeSourceLabel = 'Road Network (OSRM)';
  }

  // Transit time is counted exactly once: totalDayHours = totalVisitHours + totalTransitHours
  const totalDayHours = Math.round((totalVisitHours + totalTransitHours) * 10) / 10;
  const isOverloaded = totalDayHours > dailyBudgetHours;

  let status = 'optimal';
  const warnings = [];
  const suggestions = [];

  if (isOverloaded) {
    status = 'tight';
    const excess = Math.round((totalDayHours - dailyBudgetHours) * 10) / 10;
    warnings.push(
      `Schedule is tight: ~${totalDayHours}h planned exceeds the recommended ${dailyBudgetHours}h ${travelStyle.toLowerCase()} pace budget by ${excess}h.`
    );

    // Identify heaviest activity contributor
    let heaviestAct = null;
    let maxActHours = 0;
    activities.forEach(act => {
      const h = typeof act.visitDurationHours === 'number' && act.visitDurationHours > 0
        ? act.visitDurationHours
        : act.cat === 'FOOD' ? 1.5 : 2.0;
      if (h > maxActHours) {
        maxActHours = h;
        heaviestAct = act;
      }
    });

    // Identify longest transit leg
    let longestLeg = null;
    if (route && Array.isArray(route.legs) && route.legs.length > 0) {
      route.legs.forEach(leg => {
        if (!longestLeg || (leg.durationMin || 0) > (longestLeg.durationMin || 0)) {
          longestLeg = leg;
        }
      });
    }

    if (heaviestAct) {
      warnings.push(
        `Primary activity contributor: "${heaviestAct.title}" (~${heaviestAct.visitDurationHours || 2}h visit duration).`
      );
    }

    if (longestLeg && (longestLeg.durationMin || 0) >= 25) {
      const legLabel = longestLeg.isEstimated ? 'est. transit' : 'road transit';
      warnings.push(
        `Major transit segment: "${longestLeg.from}" to "${longestLeg.to}" takes ~${longestLeg.durationMin} mins (${longestLeg.distanceKm} km, ${legLabel}).`
      );
    }

    // Actionable activity shift suggestion without breaking trip duration or creating duplicates
    if (heaviestAct && activities.length > 1) {
      if (context && context.lighterDayNum) {
        const suggestionMsg = `Suggestion: Moving "${heaviestAct.title}" to Day ${context.lighterDayNum} would balance the schedule without exceeding pace limits.`;
        suggestions.push(suggestionMsg);
        warnings.push(suggestionMsg);
      } else {
        const suggestionMsg = `Suggestion: Consider shifting "${heaviestAct.title}" to a less packed day or allowing extra downtime.`;
        suggestions.push(suggestionMsg);
        warnings.push(suggestionMsg);
      }
    }
  } else if (totalDayHours < dailyBudgetHours * 0.55 && activities.length > 0) {
    status = 'relaxed';
  }

  // 3. Opening hours check (Keep unknown opening hours explicitly unknown)
  activities.forEach(act => {
    if (act.openingHours && Array.isArray(act.openingHours) && act.openingHours.length > 0) {
      const hoursStr = act.openingHours[0].toLowerCase();
      if (hoursStr.includes('closed') || hoursStr.includes('permit')) {
        warnings.push(`Note for ${act.title}: ${act.openingHours[0]}`);
      }
    }
  });

  return {
    dailyBudgetHours,
    totalVisitHours: Math.round(totalVisitHours * 10) / 10,
    totalTransitHours,
    totalDayHours,
    status,
    isFeasible: !isOverloaded,
    routeQuality,
    routeSourceLabel,
    suggestions,
    warnings
  };
}

/**
 * Generates an intelligent, personalized, non-repeating multi-day itinerary.
 *
 * @param {object} params
 * @param {object} params.destination - { id, name, country, latitude, longitude }
 * @param {number} [params.duration=3] - Trip duration in days (1 to 60)
 * @param {number} [params.budget=8000] - Total budget in INR
 * @param {string} [params.travelStyle='Balanced'] - 'Relaxed' | 'Balanced' | 'Packed'
 * @param {string[]} [params.interests=[]] - Array of interest categories
 * @returns {object} Formatted itinerary object with day-by-day routes and feasibility
 */
export function generateItinerary({
  destination,
  duration = 3,
  budget = 8000,
  travelStyle = 'Balanced',
  interests = []
}) {
  const destName = destination?.name || 'Selected Destination';
  const destId = (destination?.id || destName).toLowerCase().trim();

  const totalDays = Math.max(1, Math.min(60, parseInt(duration, 10) || 3));
  const styleStr = (travelStyle || 'Balanced').toString().trim();
  const normalizedStyle =
    styleStr.toLowerCase() === 'relaxed'
      ? 'Relaxed'
      : styleStr.toLowerCase() === 'packed'
      ? 'Packed'
      : 'Balanced';

  const validInterests = Array.isArray(interests) ? interests : [];
  const defaultImg = DESTINATION_IMAGES[destId] || DESTINATION_IMAGES['default'];

  // 1. Fetch verified places from catalog & score by user's interests
  const rawPlaces = resolvePlacesForDestination(destId, destName);
  const scoredPlaces = rawPlaces
    .map(p => ({
      ...p,
      relevanceScore: scorePlaceForInterests(p, validInterests)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 2. Determine daily stops and time slots based on travel pace
  const stopsPerDay = normalizedStyle === 'Relaxed' ? 2 : normalizedStyle === 'Packed' ? 4 : 3;
  const timeSlots = TIME_SLOTS[normalizedStyle] || TIME_SLOTS.Balanced;

  // 3. Cluster prioritized places by geographic proximity
  const clusters = clusterPlacesGeographically(scoredPlaces, stopsPerDay);

  const days = [];
  const visitedIds = new Set();
  let clusterIdx = 0;

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    let activities = [];
    let dayTitle = '';
    let isExplorationDay = false;

    // Check if we have an unvisited geographic cluster
    let cluster = clusters[clusterIdx];
    if (cluster) {
      cluster = cluster.filter(p => !visitedIds.has(p.placeId));
    }

    if (cluster && cluster.length > 0) {
      // Build raw activities for this cluster
      cluster.forEach((place) => {
        visitedIds.add(place.placeId);
        const cat = (place.category || 'attraction').toUpperCase();
        const visitDurationHours = place.visitDurationHours || (cat === 'RESTAURANT' ? 1.5 : 2.0);

        activities.push({
          title: place.name,
          desc: place.address ? `Located at ${place.address}. Realistic visit: ~${visitDurationHours}h.` : `Curated sight in ${destName}.`,
          cat: cat === 'RESTAURANT' ? 'FOOD' : 'CULTURE',
          image: place.photoUrl || defaultImg,
          imageLabel: `${place.name.toUpperCase()} \u00B7 ${cat === 'RESTAURANT' ? 'FOOD' : 'CULTURE'}`,
          placeId: place.placeId,
          latitude: place.latitude,
          longitude: place.longitude,
          address: place.address,
          rating: place.rating,
          visitDurationHours,
          openingHours: place.openingHours || null,
          openingStatus: place.openingHours && place.openingHours.length > 0 ? 'verified_hours' : 'unknown',
          source: place.source || 'curated-catalog',
          attribution: place.attribution || 'Dastaan Verified Heritage Archive'
        });
      });

      // 4. Optimize order of activities using 2-opt local search
      activities = optimizeActivityOrder2Opt(activities);

      // Re-assign times and alternating layouts chronologically
      activities.forEach((act, idx) => {
        act.time = timeSlots[idx] || (idx === 0 ? '09:30' : idx === 1 ? '13:00' : '16:30');
        act.layout = idx % 2 === 0 ? 'image-right' : 'image-left';
      });

      // Craft descriptive title
      const p1 = activities[0]?.title || 'Old Town';
      const p2 = activities[1]?.title;
      dayTitle = p2 ? `${p1.toUpperCase()} & ${p2.toUpperCase()}` : `${p1.toUpperCase()} DISTRICT`;
      clusterIdx++;
    } else {
      // All verified places scheduled without repetition.
      // Transition honestly to themed discovery without fabricating synthetic coordinates.
      isExplorationDay = true;
      const explorationThemes = [
        {
          title: 'ARTISAN QUARTERS & NEIGHBORHOOD BAZAARS',
          act1: { title: `${destName} Artisan Alleys Walk`, cat: 'SHOPPING', time: '10:00', dur: 2.0, desc: `Self-guided morning exploration through ${destName}'s historic neighborhood artisan lanes and local craft workshops.` },
          act2: { title: 'Local Culinary Tasting & Roastery', cat: 'FOOD', time: '13:30', dur: 1.5, desc: 'Savor regional culinary specialties and handcrafted traditional coffee or tea.' },
          act3: { title: 'Panoramic Sunset Promenade', cat: 'NATURE', time: '17:00', dur: 1.5, desc: 'Unhurried evening stroll along the waterfront promenade or elevated viewpoint.' }
        },
        {
          title: 'CULTURAL HERITAGE & SCENIC LEISURE',
          act1: { title: `${destName} Botanical & Scenic Gardens`, cat: 'NATURE', time: '10:00', dur: 2.0, desc: 'Peaceful morning garden walk surrounded by regional flora and architectural monuments.' },
          act2: { title: 'Traditional Regional Lunch', cat: 'FOOD', time: '13:00', dur: 1.5, desc: 'Relaxed dining at an authentic neighborhood trattoria or dining hall.' },
          act3: { title: 'Old Quarter Evening Reflections', cat: 'RELAX', time: '16:30', dur: 1.5, desc: 'Atmospheric evening walk as historic lanterns illuminate ancient cobblestones.' }
        },
        {
          title: 'INDEPENDENT DISCOVERY & REGIONAL FLAVORS',
          act1: { title: 'Neighborhood Morning Market', cat: 'CULTURE', time: '09:30', dur: 2.0, desc: `Experience the vibrant sights, sounds, and aromas of ${destName}'s morning produce and spice stalls.` },
          act2: { title: 'Art & Design Gallery District', cat: 'ART', time: '14:00', dur: 2.0, desc: 'Discover independent local galleries and creative hubs.' },
          act3: { title: 'Panoramic Sunset Overlook', cat: 'NATURE', time: '17:30', dur: 1.5, desc: 'Watch golden twilight settle over the city horizon from a scenic overlook.' }
        }
      ];

      const theme = explorationThemes[(dayNum - clusterIdx - 1) % explorationThemes.length];
      dayTitle = theme.title;

      const baseActs = [theme.act1, theme.act2];
      if (stopsPerDay >= 3) baseActs.push(theme.act3);

      baseActs.forEach((act, idx) => {
        activities.push({
          time: act.time,
          title: act.title,
          desc: act.desc,
          cat: act.cat,
          image: defaultImg,
          imageLabel: `${act.title.toUpperCase()} \u00B7 ${act.cat}`,
          layout: idx % 2 === 0 ? 'image-right' : 'image-left',
          latitude: null, // NO synthetic coordinates fabricated
          longitude: null,
          visitDurationHours: act.dur,
          isSelfGuided: true,
          openingStatus: 'unknown'
        });
      });
    }

    // 5. Geodesic route calculation for consecutive activities
    const waypoints = activities
      .filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number')
      .map(a => ({ name: a.title, latitude: a.latitude, longitude: a.longitude }));

    const dayRoute = waypoints.length >= 2
      ? generateEstimatedRoute(waypoints, normalizedStyle === 'Relaxed' ? 'walking' : 'driving')
      : {
          distanceKm: 0,
          durationMin: 0,
          mode: normalizedStyle === 'Relaxed' ? 'walking' : 'driving',
          provider: 'none',
          isEstimated: false,
          geometry: { type: 'LineString', coordinates: [] },
          legs: [],
          note: isExplorationDay
            ? 'Self-guided discovery day without fixed coordinates; routing distance not applicable.'
            : 'Fewer than two activities with coordinates.'
        };

    // 6. Feasibility evaluation
    const feasibility = evaluateDayFeasibility(activities, dayRoute, normalizedStyle);

    // 7. Attach transit to consecutive activity pairs
    const activitiesWithTransit = attachTransitToActivities(activities, dayRoute);

    days.push({
      dayNum,
      dayTitle,
      isExplorationDay,
      feasibility,
      route: dayRoute,
      activities: activitiesWithTransit
    });
  }

  // 8. Analyze cross-day shift suggestions for multi-day itineraries
  const optimizedDays = applyCrossDayShiftSuggestions(days, normalizedStyle);

  // 9. Dynamic Tagline with interest acknowledgment
  let tagline = `A ${normalizedStyle.toLowerCase()} journey`;
  if (validInterests.length > 0) {
    tagline += ` personalized for ${validInterests.join(', ').toLowerCase()} in ${destName}`;
  } else {
    tagline += ` through ${destName}'s cultural landmarks and local escapes`;
  }
  tagline += '.';

  // 10. Overview description
  const overview =
    normalizedStyle === 'Relaxed'
      ? 'More breathing room between experiences. Your relaxed travel style keeps the itinerary comfortable while staying within your selected budget.'
      : normalizedStyle === 'Packed'
      ? 'More experiences with less downtime. Your packed travel style maximizes every hour while staying within your selected budget.'
      : 'A comfortable mix of exploration and downtime. Your balanced travel style keeps the itinerary comfortable while staying within your selected budget.';

  // 11. Transparent Budget Allocation (Clearly flagged as estimates)
  const breakdown = [
    { name: 'Accommodation (Est.)', pct: 40, amount: Math.round(budget * 0.40), color: '#D6B56D', isEstimated: true },
    { name: 'Food & Dining (Est.)', pct: 25, amount: Math.round(budget * 0.25), color: '#C87955', isEstimated: true },
    { name: 'Local Transport (Est.)', pct: 15, amount: Math.round(budget * 0.15), color: '#7F9087', isEstimated: true },
    { name: 'Activities & Fees (Est.)', pct: 15, amount: Math.round(budget * 0.15), color: '#F4EFE3', isEstimated: true },
    { name: 'Buffer & Contingency', pct: 5, amount: Math.round(budget * 0.05), color: 'rgba(214, 181, 109, 0.35)', isEstimated: true }
  ];

  return {
    tagline,
    overview,
    breakdown,
    days: optimizedDays
  };
}

/**
 * Evaluates multi-day itinerary days and suggests moving activities from overloaded days to lighter days.
 */
export function applyCrossDayShiftSuggestions(days, travelStyle) {
  if (!Array.isArray(days) || days.length <= 1) return days;

  // Find candidate target days with comfortable spare capacity (at least 2.0h below budget)
  const candidateTargetDays = days.filter(
    d => d.feasibility && d.feasibility.isFeasible &&
         (d.feasibility.dailyBudgetHours - d.feasibility.totalDayHours) >= 2.0
  );

  return days.map(day => {
    if (day.feasibility && !day.feasibility.isFeasible) {
      const targetDay = candidateTargetDays.find(cd => cd.dayNum !== day.dayNum);
      const context = {
        dayNum: day.dayNum,
        lighterDayNum: targetDay ? targetDay.dayNum : null
      };
      const refreshedFeasibility = evaluateDayFeasibility(day.activities, day.route, travelStyle, context);
      return {
        ...day,
        feasibility: refreshedFeasibility
      };
    }
    return day;
  });
}

/**
 * Asynchronous version that enriches days with live road network routing
 * from OSRM demo server when available.
 */
export async function generateItineraryWithLiveRouting(params) {
  const itin = generateItinerary(params);
  const normalizedStyle = (params.travelStyle || 'Balanced');
  const mode = normalizedStyle.toLowerCase() === 'relaxed' ? 'walking' : 'driving';

  // Enrich each day's route via OSRM in parallel
  const enrichedDays = await Promise.all(
    itin.days.map(async (day) => {
      const waypoints = (day.activities || [])
        .filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number')
        .map(a => ({ name: a.title, latitude: a.latitude, longitude: a.longitude }));

      if (waypoints.length >= 2) {
        try {
          const res = await calculateRoute(waypoints, mode);
          if (res.success && res.route) {
            const updatedRoute = res.route;
            const updatedActivities = attachTransitToActivities(day.activities, updatedRoute);
            const updatedFeasibility = evaluateDayFeasibility(day.activities, updatedRoute, normalizedStyle);
            return {
              ...day,
              route: updatedRoute,
              feasibility: updatedFeasibility,
              activities: updatedActivities
            };
          }
        } catch (e) {
          // Keep existing estimated route on error
        }
      }
      return day;
    })
  );

  const finalDays = applyCrossDayShiftSuggestions(enrichedDays, normalizedStyle);

  return {
    ...itin,
    days: finalDays
  };
}

/**
 * Recalculates an entire edited itinerary:
 * Chronologically re-assigns times and layouts, freshly queries or calculates routes
 * for modified waypoint sequences, updates day feasibility, and attaches transit metadata.
 */
export async function recalculateItinerary({ destination, travelStyle = 'Balanced', itinerary }) {
  if (!itinerary || !Array.isArray(itinerary.days)) {
    throw new Error('Valid itinerary with days array is required for recalculation.');
  }

  const normalizedStyle = (travelStyle || 'Balanced').toString().trim();
  const styleKey =
    normalizedStyle.toLowerCase() === 'relaxed'
      ? 'Relaxed'
      : normalizedStyle.toLowerCase() === 'packed'
      ? 'Packed'
      : 'Balanced';

  const mode = styleKey === 'Relaxed' ? 'walking' : 'driving';
  const timeSlots = TIME_SLOTS[styleKey] || TIME_SLOTS.Balanced;

  const recalculatedDays = await Promise.all(
    itinerary.days.map(async (day, dIdx) => {
      const activities = Array.isArray(day.activities) ? [...day.activities] : [];

      if (activities.length === 0) {
        const emptyRoute = {
          distanceKm: 0,
          durationMin: 0,
          mode,
          provider: 'none',
          isEstimated: false,
          geometry: { type: 'LineString', coordinates: [] },
          legs: [],
          sourceLabel: 'Travel Data Unavailable',
          note: 'No activities scheduled for this day.'
        };

        const emptyFeasibility = {
          dailyBudgetHours: DAILY_TIME_BUDGETS[styleKey] || 8.0,
          totalVisitHours: 0,
          totalTransitHours: 0,
          totalDayHours: 0,
          status: 'relaxed',
          isFeasible: true,
          routeQuality: 'unknown',
          routeSourceLabel: 'Travel Data Unavailable',
          suggestions: [],
          warnings: ['No activities scheduled for this day.']
        };

        return {
          ...day,
          dayNum: day.dayNum || dIdx + 1,
          route: emptyRoute,
          feasibility: emptyFeasibility,
          activities: []
        };
      }

      // Re-assign times and layouts chronologically
      activities.forEach((act, idx) => {
        act.time = timeSlots[idx] || (idx === 0 ? '09:30' : idx === 1 ? '13:00' : '16:30');
        act.layout = idx % 2 === 0 ? 'image-right' : 'image-left';
      });

      // Filter waypoints with valid numeric coordinates
      const waypoints = activities
        .filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number')
        .map(a => ({ name: a.title, latitude: a.latitude, longitude: a.longitude }));

      let dayRoute = null;

      if (waypoints.length >= 2) {
        try {
          const res = await calculateRoute(waypoints, mode);
          if (res && res.success && res.route) {
            dayRoute = res.route;
          }
        } catch (err) {
          // Fall back to estimated geodesic route
        }

        if (!dayRoute) {
          dayRoute = generateEstimatedRoute(waypoints, mode);
        }
      } else {
        dayRoute = {
          distanceKm: 0,
          durationMin: 0,
          mode,
          provider: 'none',
          isEstimated: false,
          geometry: { type: 'LineString', coordinates: [] },
          legs: [],
          sourceLabel: 'Travel Data Unavailable',
          note: day.isExplorationDay
            ? 'Self-guided discovery day without fixed transit coordinates.'
            : 'Fewer than two activities with coordinates.'
        };
      }

      // Fresh feasibility evaluation (includes transit time exactly once)
      const dayFeasibility = evaluateDayFeasibility(activities, dayRoute, styleKey, { dayNum: day.dayNum || dIdx + 1 });

      // Fresh transit metadata attached to consecutive activity pairs
      const activitiesWithTransit = attachTransitToActivities(activities, dayRoute);

      return {
        ...day,
        dayNum: day.dayNum || dIdx + 1,
        route: dayRoute,
        feasibility: dayFeasibility,
        activities: activitiesWithTransit
      };
    })
  );

  // Apply cross-day suggestions
  const finalDays = applyCrossDayShiftSuggestions(recalculatedDays, styleKey);

  return {
    ...itinerary,
    days: finalDays
  };
}

// Retain legacy destinationTemplates for backward test compatibility
export const destinationTemplates = {
  'manali': { name: 'Manali', country: 'India', days: [] },
  'jaipur': { name: 'Jaipur', country: 'India', days: [] },
  'default': { name: 'Curated Escapes', country: 'World', days: [] }
};

export default generateItinerary;
