/**
 * Shared Itinerary Generation Service for Dastaan
 * Provides unified, grounded, non-repeating itinerary generation for both
 * the classic trip planner and conversational assistant.
 *
 * Enforces:
 *  - Factual POI grounding (using Overpass/Nominatim candidate pools)
 *  - Strict non-repetition across all trip days
 *  - Calendar date assignment when startDate is provided
 *  - Total-trip budget semantics (INR) with per-person breakdown
 *  - Multi-tier validation with retry and zero silent default fallbacks
 */

import { callNvidiaChat } from './nvidiaClient.js';
import {
  validateItinerary,
  normalizeTitle,
  isGenericPlaceholderTemplate,
  calculateJaccardSimilarity,
  calculateHaversineKm
} from './validationService.js';
import { verifyDestinationAndPois } from './groundingService.js';

/**
 * Deterministic Budget Breakdown Calculator
 * Preserves Dastaan's established total-trip budget semantics in INR.
 *
 * @param {number} totalBudget - Total trip budget in INR (₹)
 * @param {number} [travelers=1] - Traveller count
 * @returns {{breakdown: Array<Object>, estimatedCostPerPerson: number}}
 */
export function buildBudgetBreakdown(totalBudget, travelers = 1) {
  const safeBudget = Math.max(1000, parseInt(totalBudget, 10) || 8000);
  const safeTravelers = Math.max(1, Math.min(20, parseInt(travelers, 10) || 1));
  const estimatedCostPerPerson = Math.round(safeBudget / safeTravelers);

  const breakdown = [
    {
      name: 'Accommodation',
      pct: 40,
      amount: Math.round(safeBudget * 0.40),
      perPersonAmount: Math.round((safeBudget * 0.40) / safeTravelers),
      color: '#D6B56D'
    },
    {
      name: 'Food',
      pct: 25,
      amount: Math.round(safeBudget * 0.25),
      perPersonAmount: Math.round((safeBudget * 0.25) / safeTravelers),
      color: '#C87955'
    },
    {
      name: 'Transport',
      pct: 15,
      amount: Math.round(safeBudget * 0.15),
      perPersonAmount: Math.round((safeBudget * 0.15) / safeTravelers),
      color: '#7F9087'
    },
    {
      name: 'Activities',
      pct: 15,
      amount: Math.round(safeBudget * 0.15),
      perPersonAmount: Math.round((safeBudget * 0.15) / safeTravelers),
      color: '#F4EFE3'
    },
    {
      name: 'Buffer',
      pct: 5,
      amount: Math.round(safeBudget * 0.05),
      perPersonAmount: Math.round((safeBudget * 0.05) / safeTravelers),
      color: 'rgba(214, 181, 109, 0.35)'
    }
  ];

  return {
    breakdown,
    estimatedCostPerPerson
  };
}

/**
 * Computes calendar dates for each day in a trip given a valid startDate
 */
export function calculateTripDates(startDate, duration) {
  if (!startDate) return { dates: [], startDate: null, endDate: null };

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return { dates: [], startDate: null, endDate: null };

  const totalDays = Math.max(1, parseInt(duration, 10) || 1);
  const dates = [];

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(cur);
  }

  const end = dates[dates.length - 1] || start;

  return {
    dates,
    startDate: start,
    endDate: end
  };
}

/**
 * Build system prompt with schema and grounding instructions for NVIDIA NIM
 */
export function buildPromptInstructions({
  destination,
  duration,
  travelers,
  travelStyle,
  interests,
  dates,
  poiPool = []
}) {
  const destName = destination.name || 'Destination';
  const country = destination.country || 'Worldwide';
  const style = travelStyle || 'Balanced';
  const interestList = Array.isArray(interests) && interests.length > 0 ? interests.join(', ') : 'Culture, Local Highlights';

  let poiContext = '';
  if (Array.isArray(poiPool) && poiPool.length > 0) {
    const samplePois = poiPool.slice(0, 30).map(p => `- ${p.name} (${p.category}) [id: ${p.id}]`).join('\n');
    poiContext = `
VERIFIED LOCAL ATTRACTIONS & VENUES (Select activities primarily from this list):
${samplePois}
`;
  }

  const calendarContext = dates.length > 0
    ? `Trip starts on ${dates[0].toDateString()}. Use realistic day-of-week timing.`
    : 'No specific calendar date provided. Schedule days sequentially.';

  return `You are Dastaan's AI Travel Curator. Create a distinct, coherent ${duration}-day itinerary for ${destName}, ${country}.

CONSTRAINTS & RULES:
1. TRIP DURATION: Exactly ${duration} distinct days. Do NOT repeat days or attractions. Every day must have unique venues.
2. PACING (${style}):
   - Relaxed: 2 activities per day. Generous breathing room, starting around 10:00.
   - Balanced: 3 to 4 activities per day. Morning, lunch/afternoon, late afternoon.
   - Packed: 4 to 5 activities per day. Full sightseeing schedule from 08:30.
3. CHRONOLOGICAL ORDER: Times must be in strictly ascending order within each day (e.g. 09:00, 13:00, 16:30).
4. CATEGORIES: Each activity category MUST be one of: CULTURE, NATURE, FOOD, SHOPPING, HISTORY, ADVENTURE, RELAX, EXPLORE.
5. NO HALLUCINATIONS: Schedule real public attractions, historic quarters, and parks. ${poiContext}
6. CALENDAR: ${calendarContext}
7. INTERESTS: Focus on: ${interestList}.
8. TRAVELLERS: Planned for ${travelers} traveller(s).

OUTPUT FORMAT:
Return a strictly valid JSON object matching this schema without markdown code fences or conversational text:
{
  "tagline": "A short poetic summary sentence for the journey.",
  "overview": "A 2-sentence description of the pacing and experience.",
  "days": [
    {
      "dayNum": 1,
      "dayTitle": "THEMATIC TITLE FOR DAY 1",
      "activities": [
        {
          "time": "09:00",
          "title": "Exact Name of Venue",
          "desc": "Evocative, fact-checked 1-2 sentence description.",
          "cat": "HISTORY",
          "poiId": "optional-poi-id-if-selected"
        }
      ]
    }
  ]
}`;
}

/**
 * Generate a complete, verified, non-repeating itinerary using the NVIDIA NIM LLM.
 *
 * @param {Object} params
 * @param {Object} params.destination - { name, country, ... }
 * @param {number} params.duration - Duration in days (1-60)
 * @param {number} params.budget - Total budget in INR (₹)
 * @param {number} [params.travelers=1] - Number of travellers (1-20)
 * @param {string|Date} [params.startDate] - Optional start date
 * @param {string} [params.travelStyle='Balanced'] - 'Relaxed' | 'Balanced' | 'Packed'
 * @param {Array<string>} [params.interests=[]] - Selected interests
 * @param {Object} [options]
 * @param {Function} [options.fetchFn] - Custom fetch for testing
 * @returns {Promise<Object>} Complete itinerary object
 */

/**
 * Deduplicate POI candidate pool using canonical POI identity.
 * Removes duplicate stable IDs, identical normalized names (with stop-number suffixes stripped),
 * generic placeholder templates, and high-confidence aliases.
 *
 * @param {Array<Object>} poiPool - Raw POI candidates
 * @param {string} [destinationName] - Destination context
 * @returns {Array<Object>} Deduplicated, verified POI candidates
 */
export function deduplicatePoiPool(poiPool = [], destinationName = '') {
  if (!Array.isArray(poiPool)) return [];

  const seenIds = new Set();
  const seenNormNames = new Set();
  const cleanPool = [];

  for (const poi of poiPool) {
    if (!poi || !poi.name || typeof poi.name !== 'string') continue;

    // Filter out fabricated placeholder templates
    if (isGenericPlaceholderTemplate(poi.name)) continue;

    const trimmedName = poi.name.trim();
    if (trimmedName.length < 2) continue;

    // Stable ID deduplication
    const stableId = (poi.id || '').trim();
    if (stableId) {
      if (seenIds.has(stableId)) continue;
      seenIds.add(stableId);
    }

    // Normalized name deduplication
    const norm = normalizeTitle(trimmedName);
    if (seenNormNames.has(norm)) continue;

    // Alias / token similarity collision check against already accepted POIs
    let isDuplicateAlias = false;
    for (const accepted of cleanPool) {
      const jaccard = calculateJaccardSimilarity(trimmedName, accepted.name);
      if (jaccard >= 0.85) {
        const curLat = poi.lat !== undefined && poi.lat !== null ? parseFloat(poi.lat) : null;
        const curLon = poi.lon !== undefined && poi.lon !== null ? parseFloat(poi.lon) : null;
        const accLat = accepted.lat !== undefined && accepted.lat !== null ? parseFloat(accepted.lat) : null;
        const accLon = accepted.lon !== undefined && accepted.lon !== null ? parseFloat(accepted.lon) : null;
        const distKm = (curLat !== null && curLon !== null && accLat !== null && accLon !== null)
          ? calculateHaversineKm(curLat, curLon, accLat, accLon)
          : null;

        if (stableId && accepted.id && stableId !== accepted.id && distKm !== null && distKm > 1.0) {
          // Different ID and distant location: legitimate distinct venue
          continue;
        }
        isDuplicateAlias = true;
        break;
      }
    }

    if (isDuplicateAlias) continue;

    seenNormNames.add(norm);
    cleanPool.push({
      ...poi,
      name: trimmedName,
      category: (poi.category || 'EXPLORE').toUpperCase(),
      id: stableId || `poi_${cleanPool.length + 1}`
    });
  }

  return cleanPool;
}

/**
 * Deterministically constructs a validated grounded itinerary from authentic POIs.
 * Never invents generic placeholder templates or repeats venues across days.
 *
 * @param {Object} params
 * @param {string} params.destName - Destination name
 * @param {number} params.durNum - Duration in days
 * @param {string} [params.travelStyle='Balanced'] - Travel style
 * @param {Array<Object>} [params.poiPool=[]] - Verified POI candidates
 * @returns {Object} Complete itinerary with days
 */
export function buildDeterministicGroundedItinerary({ destName, durNum, travelStyle = 'Balanced', poiPool = [] }) {
  const cleanPool = deduplicatePoiPool(poiPool, destName);

  if (cleanPool.length === 0) {
    const error = new Error(`Insufficient verified public attractions found in "${destName}".`);
    error.code = 'INSUFFICIENT_ATTRACTIONS';
    throw error;
  }

  if (cleanPool.length < durNum) {
    const error = new Error(
      `Insufficient verified attractions in "${destName}" for a ${durNum}-day trip. Found ${cleanPool.length} verified venues, but at least ${durNum} are required.`
    );
    error.code = 'INSUFFICIENT_ATTRACTIONS';
    throw error;
  }

  // Pacing preference: Relaxed (2), Packed (4), Balanced (3)
  const desiredPerDay = travelStyle.toLowerCase() === 'relaxed' ? 2 : (travelStyle.toLowerCase() === 'packed' ? 4 : 3);
  const totalDesired = durNum * desiredPerDay;

  // Determine stops per day based on available distinct venues
  let qualityLimitation = null;
  const stopsDistribution = Array.from({ length: durNum }, () => 0);

  if (cleanPool.length >= totalDesired) {
    // We have plenty of POIs for all requested days at desired pacing
    for (let d = 0; d < durNum; d++) {
      stopsDistribution[d] = desiredPerDay;
    }
  } else {
    // Distribute available verified POIs evenly without exceeding desiredPerDay or repeating venues
    let availableCount = Math.min(cleanPool.length, totalDesired);
    const basePerDay = Math.max(1, Math.floor(availableCount / durNum));
    for (let d = 0; d < durNum; d++) {
      stopsDistribution[d] = basePerDay;
    }
    let remainder = availableCount - (basePerDay * durNum);
    let d = 0;
    while (remainder > 0 && d < durNum) {
      if (stopsDistribution[d] < desiredPerDay) {
        stopsDistribution[d]++;
        remainder--;
      }
      d++;
    }
    const totalScheduled = stopsDistribution.reduce((sum, n) => sum + n, 0);
    qualityLimitation = {
      limitedVerifiedVenues: true,
      requestedStops: totalDesired,
      scheduledStops: totalScheduled,
      availableVenues: cleanPool.length,
      message: `Pacing was adjusted to ${cleanPool.length} verified distinct attractions available for ${destName} without repetition.`
    };
  }

  const timesByCount = {
    1: ['10:00'],
    2: ['10:00', '15:00'],
    3: ['09:30', '13:30', '16:30'],
    4: ['09:00', '12:00', '15:00', '18:00']
  };

  const days = [];
  let poiIndex = 0;

  for (let d = 1; d <= durNum; d++) {
    const dayStopsCount = stopsDistribution[d - 1] || 1;
    const timeSlots = timesByCount[dayStopsCount] || timesByCount[3];
    const dayActivities = [];

    for (let a = 0; a < dayStopsCount; a++) {
      if (poiIndex >= cleanPool.length) break;
      const poi = cleanPool[poiIndex++];

      dayActivities.push({
        time: timeSlots[a] || '10:00',
        title: poi.name,
        desc: poi.operationalStatusNote || poi.address || `Explore and experience ${poi.name} in ${destName}.`,
        cat: (poi.category || 'EXPLORE').toUpperCase(),
        poiId: poi.id, // Stable POI ID (never appended with synthetic suffixes)
        lat: poi.lat !== undefined && poi.lat !== null ? parseFloat(poi.lat) : null,
        lon: poi.lon !== undefined && poi.lon !== null ? parseFloat(poi.lon) : null
      });
    }

    const primaryAttraction = dayActivities[0]?.title || destName;
    days.push({
      dayNum: d,
      dayTitle: `Day ${d}: Highlights of ${primaryAttraction}`,
      activities: dayActivities
    });
  }

  return {
    overview: `A thoroughly grounded and verified ${durNum}-day travel experience in ${destName}.`,
    days,
    qualityLimitation
  };
}

/**
 * Bounded repair for an itinerary that failed quality validation.
 * Replaces duplicate venues, generic templates, or missing fields using unused verified POIs from the pool.
 *
 * @param {Object} itinerary - Itinerary with days
 * @param {Array<Object>} poiPool - Candidate verified POIs
 * @param {Object} options
 * @param {number} options.expectedDays
 * @param {string} [options.travelStyle='Balanced']
 * @param {string} [options.destName='']
 * @returns {{ repairedItinerary: Object, validationResult: Object }}
 */
export function repairItineraryWithPoiPool(itinerary, poiPool = [], { expectedDays, travelStyle = 'Balanced', destName = '' } = {}) {
  if (!itinerary || !Array.isArray(itinerary.days)) {
    return {
      repairedItinerary: itinerary,
      validationResult: { isValid: false, errors: ['Itinerary has no valid days array for repair.'], warnings: [] }
    };
  }

  const cleanPool = deduplicatePoiPool(poiPool, destName);
  const usedPoiIds = new Set();
  const usedNormNames = new Set();
  const acceptedActivities = [];

  // Deep clone days to avoid mutating original
  const repairedDays = JSON.parse(JSON.stringify(itinerary.days));

  // First pass: identify activities that are already verified and unique
  repairedDays.forEach(day => {
    (day.activities || []).forEach(act => {
      const stableId = (act.poiId || '').trim();
      const norm = normalizeTitle(act.title || '');
      const isTemplate = isGenericPlaceholderTemplate(act.title);

      if (!isTemplate && act.title && !usedNormNames.has(norm) && (!stableId || !usedPoiIds.has(stableId))) {
        if (stableId) usedPoiIds.add(stableId);
        usedNormNames.add(norm);
        acceptedActivities.push(act);
      }
    });
  });

  // Candidate pool of unused verified POIs
  const unusedPois = cleanPool.filter(p => {
    const stableId = (p.id || '').trim();
    const norm = normalizeTitle(p.name);
    return (!stableId || !usedPoiIds.has(stableId)) && !usedNormNames.has(norm);
  });

  const timesByCount = {
    1: ['10:00'],
    2: ['10:00', '15:00'],
    3: ['09:30', '13:30', '16:30'],
    4: ['09:00', '12:00', '15:00', '18:00']
  };

  const finalAcceptedNames = new Set();
  const finalAcceptedIds = new Set();
  const finalRecorded = [];

  repairedDays.forEach((day, dIdx) => {
    day.dayNum = dIdx + 1;
    if (!day.dayTitle || typeof day.dayTitle !== 'string' || day.dayTitle.trim().length === 0) {
      day.dayTitle = `Day ${dIdx + 1}: Highlights of ${destName || 'Discovery'}`;
    }

    const repairedActivities = [];
    const activities = Array.isArray(day.activities) ? day.activities : [];

    for (let aIdx = 0; aIdx < activities.length; aIdx++) {
      const act = activities[aIdx];
      const stableId = (act.poiId || '').trim();
      const norm = normalizeTitle(act.title || '');
      const isTemplate = isGenericPlaceholderTemplate(act.title);

      // Check collision
      let isDuplicate = isTemplate || !act.title || finalAcceptedNames.has(norm) || (stableId && finalAcceptedIds.has(stableId));
      if (!isDuplicate) {
        for (const prev of finalRecorded) {
          const sim = calculateJaccardSimilarity(act.title, prev.title);
          if (sim >= 0.85) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (isDuplicate) {
        // Replace with an unused verified POI if available
        if (unusedPois.length > 0) {
          const replacementPoi = unusedPois.shift();
          const replNorm = normalizeTitle(replacementPoi.name);
          const replId = (replacementPoi.id || '').trim();

          finalAcceptedNames.add(replNorm);
          if (replId) finalAcceptedIds.add(replId);

          const replAct = {
            ...act,
            title: replacementPoi.name,
            desc: replacementPoi.operationalStatusNote || replacementPoi.address || `Explore ${replacementPoi.name} in ${destName}.`,
            cat: (replacementPoi.category || 'EXPLORE').toUpperCase(),
            poiId: replId || `poi_repaired_${dIdx + 1}_${aIdx + 1}`,
            lat: replacementPoi.lat !== undefined ? replacementPoi.lat : null,
            lon: replacementPoi.lon !== undefined ? replacementPoi.lon : null
          };
          repairedActivities.push(replAct);
          finalRecorded.push(replAct);
        } else {
          // No unused POI: if day already has 2 activities, prune duplicate stop
          if (repairedActivities.length >= 2) {
            continue;
          }
          // Otherwise leave to let validator accurately flag insufficient POIs
          repairedActivities.push(act);
        }
      } else {
        finalAcceptedNames.add(norm);
        if (stableId) finalAcceptedIds.add(stableId);
        repairedActivities.push(act);
        finalRecorded.push(act);
      }
    }

    // Chronological re-timing
    const standardTimes = timesByCount[Math.min(4, Math.max(1, repairedActivities.length))] || timesByCount[3];
    repairedActivities.forEach((act, idx) => {
      act.time = standardTimes[idx] || (idx === 0 ? '09:30' : idx === 1 ? '13:30' : '16:30');
    });

    day.activities = repairedActivities;
  });

  const repairedItinerary = {
    ...itinerary,
    days: repairedDays
  };

  const validationResult = validateItinerary(repairedItinerary, {
    expectedDays: expectedDays || itinerary.days.length,
    travelStyle
  });

  return {
    repairedItinerary,
    validationResult
  };
}

export async function generateGroundedItinerary(
  {
    destination,
    duration = 3,
    budget = 8000,
    travelers = 1,
    startDate = null,
    travelStyle = 'Balanced',
    interests = []
  },
  { fetchFn = fetch, preferredSource = 'auto' } = {}
) {
  const durNum = Math.max(1, Math.min(60, parseInt(duration, 10) || 3));
  const budNum = Math.max(1000, parseInt(budget, 10) || 8000);
  const travNum = Math.max(1, Math.min(20, parseInt(travelers, 10) || 1));
  const destName = destination?.name || 'Curated Escapes';

  // 1. Verify destination & retrieve verified POI candidates
  const grounding = await verifyDestinationAndPois(destName, { fetchFn, preferredSource });
  let poiPool = grounding.pois || [];
  let qualityLimitation = null;

  if (!grounding.verified) {
    if (grounding.code === 'DESTINATION_NOT_FOUND') {
      const error = new Error(`Destination "${destName}" could not be verified on the world map.`);
      error.code = 'DESTINATION_NOT_FOUND';
      throw error;
    }
    if (grounding.code === 'INSUFFICIENT_ATTRACTIONS') {
      const error = new Error(`Insufficient verified public attractions found in "${destName}".`);
      error.code = 'INSUFFICIENT_ATTRACTIONS';
      throw error;
    }
    if (grounding.code === 'POI_SERVICE_UNAVAILABLE') {
      if (preferredSource === 'overpass-only') {
        const error = new Error(`POI service unavailable for "${destName}".`);
        error.code = 'POI_SERVICE_UNAVAILABLE';
        error.retryable = true;
        throw error;
      }
      // Transition to degraded mode instead of failing: Allow LLM to use its own knowledge
      // while marking the result as unverified.
      console.warn(`[ItineraryService] POI service unavailable for "${destName}". Transitioning to degraded AI-only generation.`);
      qualityLimitation = {
        poiServiceUnavailable: true,
        message: 'Live map attraction verification is temporarily unavailable. This itinerary was generated using AI knowledge and should be verified manually.'
      };
    } else {
      const error = new Error(grounding.error || `Could not ground destination "${destName}".`);
      error.code = grounding.code || 'GROUNDING_ERROR';
      throw error;
    }
  }

  // 2. Compute Dates & Budget Breakdown
  const { dates, startDate: cleanStartDate, endDate: cleanEndDate } = calculateTripDates(startDate, durNum);
  const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(budNum, travNum);

  // 3. Prompt NVIDIA LLM
  const prompt = buildPromptInstructions({
    destination: {
      name: grounding.destination?.name || destName,
      country: grounding.destination?.country || destination?.country || 'Worldwide'
    },
    duration: durNum,
    travelers: travNum,
    travelStyle,
    interests,
    dates,
    poiPool
  });

  const messages = [
    {
      role: 'system',
      content: 'You are a professional travel planning system that outputs valid JSON only. Never output markdown fences or conversational preambles.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  let rawContent = '';
  let attempt = 0;
  let validationResult = { isValid: false, errors: [] };
  let parsed = null;

  try {
    while (attempt < 2 && !validationResult.isValid) {
      attempt++;

      const response = await callNvidiaChat({
        messages,
        temperature: attempt === 1 ? 0.2 : 0.0,
        timeoutMs: 25000, // Increased timeout for heavy itinerary generation
        responseFormat: { type: 'json_object' },
        fetchFn
      });

      rawContent = response.content;

      try {
        const cleanJson = rawContent.replace(/^```json/i, '').replace(/```$/i, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (parseErr) {
        if (attempt >= 2) throw parseErr;
        messages.push({ role: 'assistant', content: rawContent });
        messages.push({
          role: 'user',
          content: 'Your previous output was not valid JSON. Please re-output as strict valid JSON only.'
        });
        continue;
      }

      validationResult = validateItinerary(parsed, {
        expectedDays: durNum,
        travelStyle
      });

      // Attempt bounded repair if initial output failed validation
      if (!validationResult.isValid && parsed && parsed.days) {
        console.info('[ItineraryService] Attempting bounded repair using verified POI pool...');
        const repairOutcome = repairItineraryWithPoiPool(parsed, poiPool, {
          expectedDays: durNum,
          travelStyle,
          destName
        });
        if (repairOutcome.validationResult.isValid) {
          console.info('[ItineraryService] Bounded itinerary repair succeeded.');
          parsed = repairOutcome.repairedItinerary;
          validationResult = repairOutcome.validationResult;
        }
      }

      if (!validationResult.isValid && attempt < 2) {
        messages.push({ role: 'assistant', content: rawContent });
        messages.push({
          role: 'user',
          content: 'Validation failed with the following issues: ' + validationResult.errors.join('; ') + '. Please correct these issues and re-output the entire itinerary as valid JSON.'
        });
      }
    }
  } catch (llmErr) {
    console.warn('[ItineraryService] NVIDIA LLM inference unavailable (' + llmErr.message + '). Assembling verified itinerary directly from POI pool.');
    parsed = buildDeterministicGroundedItinerary({
      destName: grounding.destination?.name || destName,
      durNum,
      travelStyle,
      interests,
      poiPool
    });
    validationResult = validateItinerary(parsed, {
      expectedDays: durNum,
      travelStyle
    });
  }

  // Fallback to deterministic assembly if LLM attempts exhausted without valid outcome
  if (!validationResult.isValid) {
    console.warn('[ItineraryService] LLM generation failed quality validation. Assembling verified itinerary directly from POI pool.');
    try {
      parsed = buildDeterministicGroundedItinerary({
        destName: grounding.destination?.name || destName,
        durNum,
        travelStyle,
        interests,
        poiPool
      });
      validationResult = validateItinerary(parsed, {
        expectedDays: durNum,
        travelStyle
      });
    } catch (detErr) {
      if (detErr.code === 'INSUFFICIENT_ATTRACTIONS') {
        throw detErr;
      }
      throw detErr;
    }
  }

  if (!validationResult.isValid) {
    const error = new Error(
      `Generated itinerary failed quality validation: ${validationResult.errors.join('; ')}`
    );
    error.code = 'ITINERARY_VALIDATION_FAILED';
    error.validationErrors = validationResult.errors;
    error.qualityLimitation = parsed?.qualityLimitation || null;
    throw error;
  }

  // 4. Post-Process & Assemble Final Complete Itinerary Document
  const mergedQualityLimitation = {
    ...(qualityLimitation || {}),
    ...(parsed.qualityLimitation || {})
  };
  const finalQualityLimitation = Object.keys(mergedQualityLimitation).length > 0 ? mergedQualityLimitation : null;

  const finalDays = (parsed.days || []).map((day, dIdx) => {
    const dayDate = dates[dIdx] || null;
    const activities = (day.activities || []).map((act, aIdx) => {
      // Lookup coordinates from POI pool if not provided by LLM
      let lat = act.lat !== undefined && act.lat !== null ? parseFloat(act.lat) : null;
      let lon = act.lon !== undefined && act.lon !== null ? parseFloat(act.lon) : null;

      if ((lat === null || lon === null) && act.poiId && poiPool.length > 0) {
        const poolPoi = poiPool.find(p => p.id === act.poiId);
        if (poolPoi) {
          lat = poolPoi.lat !== undefined ? parseFloat(poolPoi.lat) : lat;
          lon = poolPoi.lon !== undefined ? parseFloat(poolPoi.lon) : lon;
        }
      }

      const mapUrl = (lat !== null && lon !== null)
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        : null;

      return {
        time: act.time,
        title: act.title,
        desc: act.desc || '',
        cat: (act.cat || 'EXPLORE').toUpperCase(),
        poiId: act.poiId || '',
        image: act.image || destination?.image || '',
        imageLabel: `${act.title.toUpperCase()} · ${(act.cat || 'EXPLORE').toUpperCase()}`,
        layout: aIdx % 2 === 0 ? 'image-right' : 'image-left',
        lat,
        lon,
        mapUrl
      };
    });

    return {
      dayNum: dIdx + 1,
      date: dayDate,
      dayTitle: day.dayTitle,
      activities
    };
  });

  return {
    destination: {
      id: (grounding.destination?.name || destName).toLowerCase().replace(/[^\w]/g, '-'),
      name: grounding.destination?.name || destName,
      country: grounding.destination?.country || destination?.country || 'Worldwide',
      image: destination?.image || ''
    },
    duration: durNum,
    travelers: travNum,
    startDate: cleanStartDate,
    endDate: cleanEndDate,
    budget: budNum,
    travelStyle,
    qualityLimitation: finalQualityLimitation,
    itinerary: {
      tagline: parsed.tagline || `A curated ${travelStyle.toLowerCase()} journey through ${destName}.`,
      overview: parsed.overview || `Every day is designed to match your ${travelStyle.toLowerCase()} pace and travel preferences.`,
      estimatedCostPerPerson,
      breakdown,
      qualityLimitation: finalQualityLimitation,
      days: finalDays
    },
    attribution: grounding.attribution || null
  };
}

export default {
  deduplicatePoiPool,
  buildDeterministicGroundedItinerary,
  repairItineraryWithPoiPool,
  buildBudgetBreakdown,
  calculateTripDates,
  buildPromptInstructions,
  generateGroundedItinerary
};
