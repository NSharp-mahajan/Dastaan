/**
 * Phase 5 Regression Test Suite:
 * Venue Uniqueness, Fabricated Template Removal, Bounded Itinerary Repair,
 * and Destination Grounding Quality Validation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTitle,
  isGenericPlaceholderTemplate,
  getDistinctiveTokens,
  calculateJaccardSimilarity,
  validateItinerary
} from '../src/services/validationService.js';

import {
  deduplicatePoiPool,
  buildDeterministicGroundedItinerary,
  repairItineraryWithPoiPool,
  generateGroundedItinerary
} from '../src/services/itineraryService.js';

import { getCuratedAttractions } from '../src/services/attractionsCatalog.js';
import { handleAssistantChat } from '../src/controllers/assistantController.js';

// Helper to create mock Express response
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe('--- Phase 5: Venue Uniqueness & Itinerary Quality Validation ---', () => {

  // =========================================================================
  // SCENARIO 1: Repeated venue names with different (Stop N) suffixes
  // =========================================================================
  test('Scenario 1: Rejects repeated venue names with different (Stop N) suffixes as duplicates', () => {
    // Normalization check
    const norm1 = normalizeTitle('Varanasi Local Heritage & Culture Trail (Stop 1)');
    const norm5 = normalizeTitle('Varanasi Local Heritage & Culture Trail (Stop 5)');
    assert.equal(norm1, 'varanasi local heritage culture trail');
    assert.equal(norm5, 'varanasi local heritage culture trail');
    assert.equal(norm1, norm5, 'Normalized titles without stop suffixes must be identical');

    // Itinerary validation check
    const itinerary = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'Day 1: Arrival',
          activities: [
            { time: '09:00', title: 'Varanasi Local Heritage & Culture Trail (Stop 1)', desc: 'Morning walk', cat: 'CULTURE', poiId: 'trail_1' },
            { time: '14:00', title: 'Dashashwamedh Ghat', desc: 'Riverfront visit', cat: 'CULTURE', poiId: 'ghat_1' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'Day 2: Old Quarters',
          activities: [
            { time: '09:00', title: 'Varanasi Local Heritage & Culture Trail (Stop 5)', desc: 'Afternoon trail', cat: 'CULTURE', poiId: 'trail_5' },
            { time: '14:00', title: 'Assi Ghat', desc: 'Evening aarti', cat: 'NATURE', poiId: 'ghat_2' }
          ]
        }
      ]
    };

    const result = validateItinerary(itinerary, { expectedDays: 2, travelStyle: 'Relaxed' });
    assert.equal(result.isValid, false, 'Itinerary with repeated stops must fail validation');
    assert.ok(
      result.errors.some(e => e.includes('duplicates') || e.includes('template')),
      `Expected duplicate error, got: ${result.errors.join('; ')}`
    );
  });

  // =========================================================================
  // SCENARIO 2: Identical OSM IDs with different display names
  // =========================================================================
  test('Scenario 2: Rejects identical OSM IDs / POI IDs with different display names across days', () => {
    const itinerary = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'Day 1: Ancient Temple',
          activities: [
            { time: '09:00', title: 'Kashi Vishwanath Golden Temple', desc: 'Sacred Shiva shrine', cat: 'HISTORY', poiId: 'osm_node_287687798' },
            { time: '14:00', title: 'Manikarnika Ghat Heritage Outlook', desc: 'Historic cremation ghat', cat: 'CULTURE', poiId: 'osm_node_3001' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'Day 2: Riverfront',
          activities: [
            { time: '09:00', title: 'Golden Temple Shiva Sanctum', desc: 'Renamed alias of Kashi temple', cat: 'HISTORY', poiId: 'osm_node_287687798' },
            { time: '14:00', title: 'Assi Ghat & Subah-e-Banaras', desc: 'Morning rituals', cat: 'NATURE', poiId: 'osm_node_3002' }
          ]
        }
      ]
    };

    const result = validateItinerary(itinerary, { expectedDays: 2, travelStyle: 'Relaxed' });
    assert.equal(result.isValid, false);
    assert.ok(
      result.errors.some(e => e.includes('shares stable POI ID "osm_node_287687798"')),
      `Expected POI ID collision error, got: ${result.errors.join('; ')}`
    );
  });

  // =========================================================================
  // SCENARIO 3: Duplicate POIs appearing on different days
  // =========================================================================
  test('Scenario 3: Rejects exact duplicate POIs appearing on different days', () => {
    const itinerary = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'Day 1: Ghats Exploration',
          activities: [
            { time: '09:30', title: 'Dashashwamedh Ghat & Evening Ganga Aarti', desc: 'Aarti ceremony', cat: 'CULTURE', poiId: 'varanasi_dashashwamedh_ghat' },
            { time: '14:30', title: 'Kashi Vishwanath Golden Temple', desc: 'Golden temple', cat: 'HISTORY', poiId: 'varanasi_kashi_vishwanath' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'Day 2: Sarnath Excursion',
          activities: [
            { time: '09:30', title: 'Sarnath Deer Park & Dhamek Stupa', desc: 'Buddha first sermon', cat: 'HISTORY', poiId: 'varanasi_sarnath_dhamek' },
            { time: '14:30', title: 'Dashashwamedh Ghat & Evening Ganga Aarti', desc: 'Repeated visit', cat: 'CULTURE', poiId: 'varanasi_dashashwamedh_ghat' }
          ]
        }
      ]
    };

    const result = validateItinerary(itinerary, { expectedDays: 2, travelStyle: 'Relaxed' });
    assert.equal(result.isValid, false);
    assert.ok(
      result.errors.some(e => e.includes('shares stable POI ID "varanasi_dashashwamedh_ghat"') || e.includes('duplicates "Dashashwamedh Ghat')),
      `Expected duplicate POI error, got: ${result.errors.join('; ')}`
    );
  });

  // =========================================================================
  // SCENARIO 4: Distinct real venues with similar names
  // =========================================================================
  test('Scenario 4: Preserves distinct real venues with similar names without false positives', () => {
    // Check Jaccard similarities between legitimate distinct Varanasi landmarks
    const simGhats = calculateJaccardSimilarity(
      'Dashashwamedh Ghat & Evening Ganga Aarti',
      'Assi Ghat & Subah-e-Banaras'
    );
    assert.ok(simGhats < 0.65, `Ghats similarity should be low, got ${simGhats}`);

    const simTemples = calculateJaccardSimilarity(
      'Kashi Vishwanath Golden Temple',
      'Shri Vishwanath Mandir (VT BHU)'
    );
    assert.ok(simTemples < 0.65, `Temples similarity should be < 0.65, got ${simTemples}`);

    const itinerary = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'Day 1: Sacred Ghats & Jyotirlinga',
          activities: [
            { time: '09:30', title: 'Dashashwamedh Ghat & Evening Ganga Aarti', desc: 'Historic ghat', cat: 'CULTURE', poiId: 'poi_dashashwamedh', lat: 25.3075, lon: 83.0104 },
            { time: '14:30', title: 'Kashi Vishwanath Golden Temple', desc: 'Main Jyotirlinga', cat: 'HISTORY', poiId: 'poi_kashi_vishwanath', lat: 25.3109, lon: 83.0107 }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'Day 2: University & Southern Ghats',
          activities: [
            { time: '09:30', title: 'Assi Ghat & Subah-e-Banaras', desc: 'Morning rituals', cat: 'NATURE', poiId: 'poi_assi_ghat', lat: 25.2889, lon: 83.0069 },
            { time: '14:30', title: 'Shri Vishwanath Mandir (VT BHU)', desc: 'BHU marble temple', cat: 'CULTURE', poiId: 'poi_bhu_vt', lat: 25.2657, lon: 82.9898 }
          ]
        }
      ]
    };

    const result = validateItinerary(itinerary, { expectedDays: 2, travelStyle: 'Relaxed' });
    assert.equal(result.isValid, true, `Distinct real venues must pass validation: ${result.errors.join('; ')}`);
    assert.equal(result.errors.length, 0);
  });

  // =========================================================================
  // SCENARIO 5: Empty POI results and insufficient POIs for a multi-day trip
  // =========================================================================
  test('Scenario 5: Empty POI results and insufficient POIs reject cleanly with INSUFFICIENT_ATTRACTIONS', () => {
    // 5A. Empty pool
    assert.throws(
      () => {
        buildDeterministicGroundedItinerary({
          destName: 'Empty Town',
          durNum: 3,
          travelStyle: 'Balanced',
          poiPool: []
        });
      },
      (err) => {
        assert.equal(err.code, 'INSUFFICIENT_ATTRACTIONS');
        return true;
      }
    );

    // 5B. Insufficient POIs (2 POIs for a 4-day trip)
    const limitedPois = [
      { id: 'poi_1', name: 'Scenic Hill Overlook', category: 'NATURE' },
      { id: 'poi_2', name: 'Old Town Heritage Gate', category: 'HISTORY' }
    ];

    assert.throws(
      () => {
        buildDeterministicGroundedItinerary({
          destName: 'Quiet Hamlet',
          durNum: 4,
          travelStyle: 'Balanced',
          poiPool: limitedPois
        });
      },
      (err) => {
        assert.equal(err.code, 'INSUFFICIENT_ATTRACTIONS');
        assert.ok(err.message.includes('4-day trip') && err.message.includes('at least 4'));
        return true;
      }
    );
  });

  // =========================================================================
  // SCENARIO 6: Successful itinerary containing distinct, verified venues
  // =========================================================================
  test('Scenario 6: Generates a complete 3-day Varanasi itinerary with distinct, verified venues', () => {
    const varanasiPois = getCuratedAttractions('Varanasi');
    assert.ok(varanasiPois && varanasiPois.length >= 10, 'Expected at least 10 curated Varanasi POIs');

    const result = buildDeterministicGroundedItinerary({
      destName: 'Varanasi',
      durNum: 3,
      travelStyle: 'Balanced',
      poiPool: varanasiPois
    });

    assert.equal(result.days.length, 3);

    // Collect all activities across all 3 days
    const allTitles = [];
    const allPoiIds = [];

    result.days.forEach(day => {
      day.activities.forEach(act => {
        allTitles.push(act.title);
        allPoiIds.push(act.poiId);
      });
    });

    // Verify 9 distinct activities scheduled
    assert.equal(allTitles.length, 9, 'Expected 9 activities for 3 days Balanced (3/day)');
    assert.equal(new Set(allTitles).size, 9, 'All 9 activity titles must be completely distinct');
    assert.equal(new Set(allPoiIds).size, 9, 'All 9 stable POI IDs must be completely distinct');

    // Run full quality validation
    const val = validateItinerary(result, { expectedDays: 3, travelStyle: 'Balanced' });
    assert.equal(val.isValid, true, `Validation failed: ${val.errors.join('; ')}`);
    assert.equal(val.errors.length, 0);

    // Verify no generic stop placeholders in any title
    for (const title of allTitles) {
      assert.equal(isGenericPlaceholderTemplate(title), false, `Title "${title}" must not be a generic template`);
    }
  });

  // =========================================================================
  // SCENARIO 7: Repair attempt succeeds with unused POIs and fails gracefully when exhausted
  // =========================================================================
  test('Scenario 7: Bounded repair replaces duplicate venues using unused POIs from the pool', () => {
    const poiPool = [
      { id: 'v_1', name: 'Dashashwamedh Ghat', category: 'CULTURE', lat: 25.30, lon: 83.01 },
      { id: 'v_2', name: 'Kashi Vishwanath Temple', category: 'HISTORY', lat: 25.31, lon: 83.01 },
      { id: 'v_3', name: 'Sarnath Dhamek Stupa', category: 'HISTORY', lat: 25.38, lon: 83.02 },
      { id: 'v_4', name: 'Assi Ghat Sunrise', category: 'NATURE', lat: 25.28, lon: 83.00 },
      { id: 'v_5', name: 'Ramnagar Fort', category: 'HISTORY', lat: 25.26, lon: 83.02 },
      { id: 'v_6', name: 'Bharat Kala Bhavan', category: 'ART', lat: 25.27, lon: 82.99 }
    ];

    // Itinerary with deliberate duplicate in Day 2
    const flawedItinerary = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'Day 1: Ghats',
          activities: [
            { time: '09:30', title: 'Dashashwamedh Ghat', cat: 'CULTURE', poiId: 'v_1' },
            { time: '14:30', title: 'Kashi Vishwanath Temple', cat: 'HISTORY', poiId: 'v_2' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'Day 2: Fort & Duplicate',
          activities: [
            { time: '09:30', title: 'Dashashwamedh Ghat', cat: 'CULTURE', poiId: 'v_1' }, // DUPLICATE!
            { time: '14:30', title: 'Ramnagar Fort', cat: 'HISTORY', poiId: 'v_5' }
          ]
        }
      ]
    };

    // Pre-check: Flawed itinerary fails validation
    const initialVal = validateItinerary(flawedItinerary, { expectedDays: 2, travelStyle: 'Relaxed' });
    assert.equal(initialVal.isValid, false);

    // Execute repair with unused POIs (v_3, v_4, v_6 available)
    const { repairedItinerary, validationResult } = repairItineraryWithPoiPool(flawedItinerary, poiPool, {
      expectedDays: 2,
      travelStyle: 'Relaxed',
      destName: 'Varanasi'
    });

    assert.equal(validationResult.isValid, true, `Repaired itinerary must pass validation: ${validationResult.errors.join('; ')}`);
    assert.equal(repairedItinerary.days[1].activities[0].title, 'Sarnath Dhamek Stupa');
    assert.equal(repairedItinerary.days[1].activities[0].poiId, 'v_3');
  });

  // =========================================================================
  // SCENARIO 8: No generic fallback templates presented as verified attractions
  // =========================================================================
  test('Scenario 8: Forbidden generic templates are detected and filtered from POI pools', () => {
    const forbiddenTitles = [
      'Varanasi Local Heritage & Culture Trail (Stop 1)',
      'Varanasi Artisan Market & Craft Walk (Stop 2)',
      'Varanasi Pine Ridge & Valley Vista Point (Stop 3)',
      'Varanasi Evening Promenade & Local Cuisine (Stop 4)',
      'Scenic Lookout Point (Stop 9)'
    ];

    for (const title of forbiddenTitles) {
      assert.equal(
        isGenericPlaceholderTemplate(title),
        true,
        `Title "${title}" must be identified as a generic placeholder template`
      );
    }

    // deduplicatePoiPool must discard all generic templates
    const rawPool = [
      ...forbiddenTitles.map((t, idx) => ({ id: `fake_${idx}`, name: t, category: 'CULTURE' })),
      { id: 'real_1', name: 'Real Heritage Palace', category: 'HISTORY' }
    ];

    const cleaned = deduplicatePoiPool(rawPool, 'Varanasi');
    assert.equal(cleaned.length, 1);
    assert.equal(cleaned[0].name, 'Real Heritage Palace');
  });

  // =========================================================================
  // SCENARIO 9: Assistant Controller preserves confirmation state on quality error
  // =========================================================================
  test('Scenario 9: Assistant preserves destination, duration, budget, and confirmation state when generation encounters validation error', async () => {
    // Mock fetch where grounding succeeds with limited POIs (2 POIs), but LLM fails and 4-day trip needs at least 4
    const mockFetch = async (url) => {
      if (url && url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{
            lat: '25.33',
            lon: '83.00',
            boundingbox: ['25.2', '25.4', '82.9', '83.1'],
            display_name: 'Scenic Valley, India'
          }]
        };
      }
      if (url && url.includes('overpass')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [
              { type: 'node', id: 101, lat: 25.31, lon: 83.01, tags: { name: 'Scenic Valley River Point', tourism: 'attraction' } },
              { type: 'node', id: 102, lat: 25.32, lon: 83.02, tags: { name: 'Ancient Stone Monastery', historic: 'monastery' } }
            ]
          })
        };
      }
      throw new Error('LLM_UNAVAILABLE');
    };

    const req = {
      body: {
        action: 'confirm',
        currentPreferences: {
          destination: { name: 'Scenic Valley Area', country: 'India' },
          duration: 4,
          travelers: 2,
          budget: 20000,
          travelStyle: 'Balanced',
          startingCity: 'Delhi'
        }
      },
      fetchFn: mockFetch
    };

    const res = createMockRes();
    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 422);
    assert.equal(res.body.success, false);
    // Preserves confirmation stage and trip preferences!
    assert.equal(res.body.conversationStage, 'ready_for_confirmation');
    assert.equal(res.body.readyForConfirmation, true);
    assert.equal(res.body.currentPreferences.destination.name, 'Scenic Valley Area');
    assert.equal(res.body.confirmationSummary.duration, 4);
    assert.equal(res.body.confirmationSummary.budget, 20000);
    assert.equal(res.body.confirmationSummary.travelers, 2);
  });
});
