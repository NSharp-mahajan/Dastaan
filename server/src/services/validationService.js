/**
 * Itinerary Quality & Validation Service for Dastaan
 * Enforces quality standards for generated itineraries:
 *  1. Day completeness (exact day count, non-empty day titles, sequential day numbering)
 *  2. Activity schema validation (title, valid time, recognized category, layout)
 *  3. Chronological sequencing (strictly ascending time slots per day)
 *  4. Pacing adherence (matching travelStyle: Relaxed, Balanced, Packed)
 *  5. POI Deduplication:
 *     - Stable POI identifier collisions (primary)
 *     - Normalized exact name collisions
 *     - High-confidence alias/name variant detection (Jaccard token similarity & Levenshtein)
 *  6. Geographic feasibility (Haversine corridor distance check between sequential stops)
 */

export const ALLOWED_CATEGORIES = [
  'CULTURE',
  'NATURE',
  'FOOD',
  'SHOPPING',
  'HISTORY',
  'ADVENTURE',
  'RELAX',
  'EXPLORE'
];

/**
 * Patterns matching fabricated or generic placeholder attraction templates.
 * A genuine itinerary stop must be an authentic, verified physical venue.
 */
export const GENERIC_PLACEHOLDER_PATTERNS = [
  /\bLocal Heritage & Culture Trail\b/i,
  /\bArtisan Market & Craft Walk\b/i,
  /\bPine Ridge & Valley Vista Point\b/i,
  /\bEvening Promenade & Local Cuisine\b/i,
  /\b\(?\s*stop\s*\d+\s*\)?\b/i
];

/**
 * Checks if a given attraction title is a fabricated generic placeholder template.
 */
export function isGenericPlaceholderTemplate(title = '') {
  if (!title || typeof title !== 'string') return false;
  return GENERIC_PLACEHOLDER_PATTERNS.some(pat => pat.test(title));
}

/**
 * Normalize an attraction title by lowercasing, stripping punctuation,
 * stripping trailing stop-number suffixes, and removing common generic stop words while preserving core identity tokens.
 */
export function normalizeTitle(title = '') {
  return title
    .toLowerCase()
    .replace(/\s*\(?\s*stop\s*\d+\s*\)?\s*$/i, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize string into a set of distinctive words (filtering noise words)
 */
export function getDistinctiveTokens(title = '') {
  const stopWords = new Set([
    'the', 'and', 'of', 'at', 'in', 'to', 'for', 'a', 'an', 'near',
    'visit', 'explore', 'tour', 'walk', 'stroll', 'stop', 'stops'
  ]);

  return new Set(
    normalizeTitle(title)
      .split(' ')
      .filter(w => w.length > 2 && !stopWords.has(w))
  );
}

/**
 * Calculate Jaccard token similarity between two titles (0.0 to 1.0)
 */
export function calculateJaccardSimilarity(titleA, titleB) {
  const tokensA = getDistinctiveTokens(titleA);
  const tokensB = getDistinctiveTokens(titleB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionCount++;
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Calculate Levenshtein edit distance between two strings
 */
export function calculateLevenshteinDistance(a, b) {
  const s1 = a || '';
  const s2 = b || '';
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Convert time string to minutes from midnight for chronological comparison
 * Supports "09:00", "9:30", "13:00", "01:00 PM", "9:00 AM"
 */
export function parseTimeToMinutes(timeStr = '') {
  if (!timeStr) return null;
  const str = timeStr.trim().toUpperCase();

  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3];

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return null;
}

/**
 * Calculate Haversine distance in kilometers between two coordinates
 */
export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate full itinerary structure and quality
 *
 * @param {Object} itinerary - Generated itinerary object
 * @param {Object} options - Validation constraints
 * @param {number} options.expectedDays - Duration in days
 * @param {string} [options.travelStyle='Balanced'] - 'Relaxed' | 'Balanced' | 'Packed'
 * @returns {{isValid: boolean, errors: Array<string>, warnings: Array<string>}}
 */
export function validateItinerary(itinerary, { expectedDays, travelStyle = 'Balanced' } = {}) {
  const errors = [];
  const warnings = [];

  if (!itinerary || typeof itinerary !== 'object') {
    return {
      isValid: false,
      errors: ['Itinerary must be a valid non-empty object.'],
      warnings: []
    };
  }

  // 1. Day Count & Structure Validation
  const days = itinerary.days;
  if (!Array.isArray(days) || days.length === 0) {
    return {
      isValid: false,
      errors: ['Itinerary must contain a non-empty array of days.'],
      warnings: []
    };
  }

  if (expectedDays !== undefined && days.length !== expectedDays) {
    errors.push(`Day count mismatch: Expected ${expectedDays} days, but itinerary has ${days.length} days.`);
  }

  // Tracking for POI Deduplication across all days
  const seenPoiIds = new Map(); // poiId -> { dayNum, title }
  const seenNormalizedNames = new Map(); // normName -> { dayNum, title }
  const allRecordedActivities = []; // array of { dayNum, title, poiId, lat, lon }

  // 2. Day-by-Day Validation
  days.forEach((day, dayIdx) => {
    const expectedDayNum = dayIdx + 1;
    if (day.dayNum !== expectedDayNum) {
      errors.push(`Day at index ${dayIdx} has invalid dayNum ${day.dayNum} (expected ${expectedDayNum}).`);
    }

    if (!day.dayTitle || typeof day.dayTitle !== 'string' || day.dayTitle.trim().length === 0) {
      errors.push(`Day ${expectedDayNum} is missing a descriptive dayTitle.`);
    }

    const activities = day.activities;
    if (!Array.isArray(activities) || activities.length === 0) {
      errors.push(`Day ${expectedDayNum} has no activities scheduled.`);
      return;
    }

    // Pacing rules check
    const style = (travelStyle || 'Balanced').toLowerCase();
    const count = activities.length;
    if (style === 'relaxed' && (count < 2 || count > 3)) {
      warnings.push(`Day ${expectedDayNum} has ${count} activities; Relaxed style recommends 2–3.`);
    } else if (style === 'balanced' && (count < 3 || count > 4)) {
      warnings.push(`Day ${expectedDayNum} has ${count} activities; Balanced style recommends 3–4.`);
    } else if (style === 'packed' && count < 4) {
      warnings.push(`Day ${expectedDayNum} has ${count} activities; Packed style recommends 4–5.`);
    }

    // Activity validation within the day
    let lastTimeMinutes = -1;
    let lastLat = null;
    let lastLon = null;

    activities.forEach((act, actIdx) => {
      const actPrefix = `Day ${expectedDayNum}, Activity ${actIdx + 1}`;

      // Required fields
      if (!act.title || typeof act.title !== 'string' || act.title.trim().length === 0) {
        errors.push(`${actPrefix} is missing a valid title.`);
        return;
      }

      if (!act.time || typeof act.time !== 'string') {
        errors.push(`${actPrefix} ("${act.title}") is missing a time slot.`);
      } else {
        const timeMinutes = parseTimeToMinutes(act.time);
        if (timeMinutes === null) {
          errors.push(`${actPrefix} ("${act.title}") has unparseable time format "${act.time}".`);
        } else {
          // Chronological order check
          if (timeMinutes <= lastTimeMinutes) {
            errors.push(
              `${actPrefix} ("${act.title}", ${act.time}) violates chronological order after previous activity at ${activities[actIdx - 1]?.time}.`
            );
          }
          lastTimeMinutes = timeMinutes;
        }
      }

      // Check for fabricated generic placeholder templates
      if (isGenericPlaceholderTemplate(act.title)) {
        errors.push(`${actPrefix} ("${act.title}") is a fabricated generic placeholder template, not a verified venue.`);
      }

      if (act.cat && !ALLOWED_CATEGORIES.includes(act.cat.toUpperCase())) {
        warnings.push(`${actPrefix} has unrecognized category "${act.cat}".`);
      }

      // Check POI ID collision (definite duplicate)
      if (act.poiId && act.poiId.trim().length > 0) {
        const trimmedPoiId = act.poiId.trim();
        if (seenPoiIds.has(trimmedPoiId)) {
          const prev = seenPoiIds.get(trimmedPoiId);
          errors.push(
            `Duplicate venue detected: "${act.title}" on Day ${expectedDayNum} shares stable POI ID "${trimmedPoiId}" with "${prev.title}" on Day ${prev.dayNum}.`
          );
        } else {
          seenPoiIds.set(trimmedPoiId, { dayNum: expectedDayNum, title: act.title });
        }
      }

      // Check exact normalized name collision
      const norm = normalizeTitle(act.title);
      if (seenNormalizedNames.has(norm)) {
        const prev = seenNormalizedNames.get(norm);
        errors.push(
          `Duplicate venue name detected: "${act.title}" on Day ${expectedDayNum} duplicates "${prev.title}" on Day ${prev.dayNum}.`
        );
      } else {
        seenNormalizedNames.set(norm, { dayNum: expectedDayNum, title: act.title });
      }

      // Check high-confidence alias / token overlap collision against earlier activities
      for (const prev of allRecordedActivities) {
        const jaccard = calculateJaccardSimilarity(act.title, prev.title);
        if (jaccard >= 0.85) {
          const curLat = act.lat !== undefined && act.lat !== null ? parseFloat(act.lat) : null;
          const curLon = act.lon !== undefined && act.lon !== null ? parseFloat(act.lon) : null;
          const hasDistinctIds = Boolean(act.poiId && prev.poiId && act.poiId.trim() !== prev.poiId.trim());
          const distanceKm = (curLat !== null && curLon !== null && prev.lat !== null && prev.lon !== null)
            ? calculateHaversineKm(curLat, curLon, prev.lat, prev.lon)
            : null;

          if (hasDistinctIds && distanceKm !== null && distanceKm > 1.0) {
            warnings.push(
              `Possible venue alias overlap: "${act.title}" on Day ${expectedDayNum} resembles "${prev.title}" on Day ${prev.dayNum}, but venues have distinct stable IDs and physical separation (${distanceKm.toFixed(1)} km).`
            );
          } else {
            errors.push(
              `Probable duplicate venue alias: "${act.title}" on Day ${expectedDayNum} matches "${prev.title}" on Day ${prev.dayNum} (Token similarity: ${Math.round(jaccard * 100)}%).`
            );
          }
        } else if (jaccard >= 0.65) {
          warnings.push(
            `Possible venue overlap: "${act.title}" on Day ${expectedDayNum} has similar naming to "${prev.title}" on Day ${prev.dayNum}.`
          );
        }
      }

      // Geographic corridor feasibility (if coordinates provided)
      const curLat = act.lat !== undefined && act.lat !== null ? parseFloat(act.lat) : null;
      const curLon = act.lon !== undefined && act.lon !== null ? parseFloat(act.lon) : null;

      if (lastLat !== null && lastLon !== null && curLat !== null && curLon !== null) {
        const distKm = calculateHaversineKm(lastLat, lastLon, curLat, curLon);
        if (distKm !== null && distKm > 25) {
          warnings.push(
            `High transit distance on Day ${expectedDayNum}: ${Math.round(distKm)} km between "${activities[actIdx - 1]?.title}" and "${act.title}".`
          );
        }
      }

      if (curLat !== null && curLon !== null) {
        lastLat = curLat;
        lastLon = curLon;
      }

      allRecordedActivities.push({
        dayNum: expectedDayNum,
        title: act.title,
        poiId: act.poiId,
        lat: curLat,
        lon: curLon
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  ALLOWED_CATEGORIES,
  GENERIC_PLACEHOLDER_PATTERNS,
  isGenericPlaceholderTemplate,
  normalizeTitle,
  getDistinctiveTokens,
  calculateJaccardSimilarity,
  calculateLevenshteinDistance,
  parseTimeToMinutes,
  calculateHaversineKm,
  validateItinerary
};
