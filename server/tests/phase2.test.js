/**
 * Phase 2 Integration Test Suite: Trip Controller Integration,
 * Shared Itinerary Service, Factual Grounding & Acceptance Tests.
 *
 * All external network services (NVIDIA NIM, Nominatim, Overpass) are strictly mocked.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import Trip from '../src/models/Trip.js';
import { createTrip, getTripById, updateTrip } from '../src/controllers/tripController.js';
import { clearGroundingCache } from '../src/services/groundingService.js';

// Mock Response Helper
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

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  id: '507f1f77bcf86cd799439011',
  email: 'traveler@dastaan.com'
};

// Fast mock fetch for curated/offline tests
const mockOfflineFetch = async () => {
  throw new Error('Offline mock: Use local template');
};

test('--- Phase 2 Acceptance Tests: Shared Itinerary Generation & Validation ---', async (t) => {
  t.beforeEach(() => {
    clearGroundingCache();
  });

  await t.test('Acceptance 1: A five-day Jaipur itinerary contains no repeated POIs', async () => {
    // Stub Trip.create so test does not require live MongoDB connection
    const originalCreate = Trip.create;
    let savedTripData = null;
    Trip.create = async (data) => {
      savedTripData = { _id: '673f1a2b9c3d4e0012a56789', ...data };
      return savedTripData;
    };

    try {
      const req = {
        user: mockUser,
        fetchFn: mockOfflineFetch,
        body: {
          destination: { id: 'jaipur', name: 'Jaipur', country: 'India' },
          duration: 5,
          travelers: 2,
          budget: 25000,
          travelStyle: 'Balanced',
          interests: ['History', 'Culture']
        }
      };
      const res = createMockRes();

      await createTrip(req, res, () => {});

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.ok(savedTripData);

      const days = savedTripData.itinerary.days;
      assert.equal(days.length, 5);

      // Verify zero duplicate POIs or venue titles across all 5 days
      const allVenueTitles = [];
      days.forEach((day, dIdx) => {
        assert.equal(day.dayNum, dIdx + 1);
        assert.ok(day.activities.length >= 2);
        day.activities.forEach(act => {
          assert.ok(act.title && act.title.trim().length > 0);
          assert.equal(
            allVenueTitles.includes(act.title),
            false,
            `Duplicate venue "${act.title}" detected on Day ${dIdx + 1}`
          );
          allVenueTitles.push(act.title);
        });
      });
    } finally {
      Trip.create = originalCreate;
    }
  });

  await t.test('Acceptance 2: A four-day Tokyo itinerary uses grounded POIs and attaches calendar dates', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key';

    const mockFetch = async (url) => {
      // Nominatim Mock for Tokyo
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              lat: '35.6762',
              lon: '139.6503',
              display_name: 'Tokyo, Japan',
              boundingbox: ['35.50', '35.85', '139.50', '139.90'],
              address: { city: 'Tokyo', country: 'Japan' }
            }
          ]
        };
      }

      // Overpass Mock for Tokyo
      if (url.includes('overpass-api.de')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [
              { type: 'node', id: 1001, tags: { name: 'Senso-ji Temple', tourism: 'attraction' } },
              { type: 'node', id: 1002, tags: { name: 'Meiji Jingu Shrine', tourism: 'attraction' } },
              { type: 'node', id: 1003, tags: { name: 'Tokyo National Museum', tourism: 'museum' } },
              { type: 'node', id: 1004, tags: { name: 'Shinjuku Gyoen National Garden', leisure: 'park' } },
              { type: 'node', id: 1005, tags: { name: 'Tsukiji Outer Market', amenity: 'marketplace' } },
              { type: 'node', id: 1006, tags: { name: 'Imperial Palace East Gardens', leisure: 'garden' } },
              { type: 'node', id: 1007, tags: { name: 'Akihabara Electronic Town', shop: 'electronics' } },
              { type: 'node', id: 1008, tags: { name: 'Roppongi Hills Mori Tower', tourism: 'viewpoint' } }
            ]
          })
        };
      }

      // NVIDIA NIM Mock
      if (url.includes('/chat/completions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    tagline: 'A modern and traditional journey through Tokyo.',
                    overview: 'Balanced pacing through Tokyo landmarks.',
                    days: [
                      {
                        dayNum: 1,
                        dayTitle: 'HISTORIC SHRINES & GARDENS',
                        activities: [
                          { time: '09:00', title: 'Senso-ji Temple', cat: 'CULTURE', poiId: 'osm_node_1001' },
                          { time: '13:00', title: 'Tokyo National Museum', cat: 'CULTURE', poiId: 'osm_node_1003' }
                        ]
                      },
                      {
                        dayNum: 2,
                        dayTitle: 'IMPERIAL GARDENS & MARKETS',
                        activities: [
                          { time: '09:30', title: 'Imperial Palace East Gardens', cat: 'NATURE', poiId: 'osm_node_1006' },
                          { time: '13:00', title: 'Tsukiji Outer Market', cat: 'FOOD', poiId: 'osm_node_1005' }
                        ]
                      },
                      {
                        dayNum: 3,
                        dayTitle: 'SACRED GROVES & CITADELS',
                        activities: [
                          { time: '09:30', title: 'Meiji Jingu Shrine', cat: 'CULTURE', poiId: 'osm_node_1002' },
                          { time: '14:00', title: 'Shinjuku Gyoen National Garden', cat: 'NATURE', poiId: 'osm_node_1004' }
                        ]
                      },
                      {
                        dayNum: 4,
                        dayTitle: 'URBAN CULTURE & SKYLINE PANORAMAS',
                        activities: [
                          { time: '10:00', title: 'Akihabara Electronic Town', cat: 'SHOPPING', poiId: 'osm_node_1007' },
                          { time: '17:00', title: 'Roppongi Hills Mori Tower', cat: 'CULTURE', poiId: 'osm_node_1008' }
                        ]
                      }
                    ]
                  })
                }
              }
            ]
          })
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    };

    const originalCreate = Trip.create;
    let savedTripData = null;
    Trip.create = async (data) => {
      savedTripData = { _id: '673f1a2b9c3d4e0012a56790', ...data };
      return savedTripData;
    };

    try {
      const req = {
        user: mockUser,
        fetchFn: mockFetch,
        body: {
          destination: { name: 'Tokyo', country: 'Japan' },
          duration: 4,
          travelers: 3,
          startDate: '2026-12-10T00:00:00Z',
          budget: 90000,
          travelStyle: 'Balanced',
          interests: ['Culture', 'Food']
        }
      };
      const res = createMockRes();

      await createTrip(req, res, () => {});

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.ok(savedTripData);
      assert.equal(savedTripData.travelers, 3);
      assert.equal(savedTripData.startDate.toISOString(), '2026-12-10T00:00:00.000Z');
      assert.equal(savedTripData.endDate.toISOString(), '2026-12-13T00:00:00.000Z');
      assert.equal(savedTripData.itinerary.estimatedCostPerPerson, 30000);

      // Verify all 4 days have correct calendar dates
      const days = savedTripData.itinerary.days;
      assert.equal(days.length, 4);
      assert.equal(days[0].date.toISOString(), '2026-12-10T00:00:00.000Z');
      assert.equal(days[1].date.toISOString(), '2026-12-11T00:00:00.000Z');
      assert.equal(days[2].date.toISOString(), '2026-12-12T00:00:00.000Z');
      assert.equal(days[3].date.toISOString(), '2026-12-13T00:00:00.000Z');

      // Verify grounded POIs are preserved in activities
      assert.equal(days[0].activities[0].poiId, 'osm_node_1001');
      assert.equal(days[0].activities[0].title, 'Senso-ji Temple');
    } finally {
      Trip.create = originalCreate;
    }
  });

  await t.test('Acceptance 3: Unknown destination returns structured error without falling back to Delhi', async () => {
    const mockUnknownFetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return { ok: true, status: 200, json: async () => [] };
      }
      throw new Error('Should not reach Overpass or LLM');
    };

    let tripSaved = false;
    const originalCreate = Trip.create;
    Trip.create = async () => {
      tripSaved = true;
    };

    try {
      const req = {
        user: mockUser,
        fetchFn: mockUnknownFetch,
        body: {
          destination: { name: 'FictionalAtlantis999' },
          duration: 3,
          budget: 10000
        }
      };
      const res = createMockRes();

      await createTrip(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'DESTINATION_NOT_FOUND');
      assert.ok(res.body.message.includes('could not be verified'));
      assert.equal(tripSaved, false, 'Trip must not be saved when destination is unverified');
    } finally {
      Trip.create = originalCreate;
    }
  });

  await t.test('Acceptance 4: Insufficient POI data returns appropriate error without saving misleading trip', async () => {
    const mockSparseFetch = async (url) => {
      // Nominatim resolves city
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              lat: '15.00',
              lon: '74.00',
              display_name: 'Sparse Desert Outpost',
              boundingbox: ['14.9', '15.1', '73.9', '74.1'],
              address: { town: 'Sparse Outpost', country: 'Nowhere' }
            }
          ]
        };
      }
      // Overpass returns zero attractions
      if (url.includes('overpass-api.de')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ elements: [] })
        };
      }
      throw new Error('Should not reach LLM');
    };

    let tripSaved = false;
    const originalCreate = Trip.create;
    Trip.create = async () => {
      tripSaved = true;
    };

    try {
      const req = {
        user: mockUser,
        fetchFn: mockSparseFetch,
        body: {
          destination: { name: 'Sparse Desert Outpost' },
          duration: 3,
          budget: 10000
        }
      };
      const res = createMockRes();

      await createTrip(req, res, () => {});

      assert.equal(res.statusCode, 422);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INSUFFICIENT_ATTRACTIONS');
      assert.equal(tripSaved, false, 'Trip must not be saved when attractions are insufficient');
    } finally {
      Trip.create = originalCreate;
    }
  });

  await t.test('Acceptance 5: Invalid dates and traveller counts are rejected with 400', async () => {
    // 1. Travelers < 1
    const reqZero = {
      user: mockUser,
      body: {
        destination: { name: 'Jaipur' },
        duration: 3,
        travelers: 0,
        budget: 8000
      }
    };
    const resZero = createMockRes();
    await createTrip(reqZero, resZero, () => {});
    assert.equal(resZero.statusCode, 400);
    assert.ok(resZero.body.message.includes('Traveller count'));

    // 2. Travelers > 20
    const reqHigh = {
      user: mockUser,
      body: {
        destination: { name: 'Jaipur' },
        duration: 3,
        travelers: 25,
        budget: 8000
      }
    };
    const resHigh = createMockRes();
    await createTrip(reqHigh, resHigh, () => {});
    assert.equal(resHigh.statusCode, 400);
    assert.ok(resHigh.body.message.includes('Traveller count'));

    // 3. Invalid date string
    const reqDate = {
      user: mockUser,
      body: {
        destination: { name: 'Jaipur' },
        duration: 3,
        startDate: 'not-a-valid-date-format',
        budget: 8000
      }
    };
    const resDate = createMockRes();
    await createTrip(reqDate, resDate, () => {});
    assert.equal(resDate.statusCode, 400);
    assert.ok(resDate.body.message.includes('start date format'));
  });

  await t.test('Acceptance 6: Budget totals and per-person calculations remain consistent across create and update', async () => {
    const originalCreate = Trip.create;
    let savedTripData = null;
    Trip.create = async (data) => {
      savedTripData = { _id: '673f1a2b9c3d4e0012a56799', ...data };
      return savedTripData;
    };

    try {
      // 1. Create trip: Budget ₹40,000 for 4 travellers
      const reqCreate = {
        user: mockUser,
        fetchFn: mockOfflineFetch,
        body: {
          destination: { id: 'jaipur', name: 'Jaipur' },
          duration: 3,
          travelers: 4,
          budget: 40000,
          travelStyle: 'Balanced'
        }
      };
      const resCreate = createMockRes();
      await createTrip(reqCreate, resCreate, () => {});

      assert.equal(resCreate.statusCode, 201);
      assert.equal(savedTripData.budget, 40000);
      assert.equal(savedTripData.travelers, 4);
      assert.equal(savedTripData.itinerary.estimatedCostPerPerson, 10000);

      const bdCreate = savedTripData.itinerary.breakdown;
      assert.equal(bdCreate[0].amount, 16000); // 40% of 40k
      assert.equal(bdCreate[0].perPersonAmount, 4000); // 16k / 4

      // 2. Update trip: Update travelers to 2 (without full regeneration)
      const mockTripDoc = {
        _id: '673f1a2b9c3d4e0012a56799',
        user: mockUser.id,
        duration: 3,
        budget: 40000,
        travelers: 4,
        travelStyle: 'Balanced',
        itinerary: savedTripData.itinerary,
        save: async function () { return this; }
      };

      const originalFindById = Trip.findById;
      Trip.findById = async () => mockTripDoc;

      try {
        const reqUpdate = {
          params: { id: '673f1a2b9c3d4e0012a56799' },
          user: mockUser,
          fetchFn: mockOfflineFetch,
          body: {
            travelers: 2
          }
        };
        const resUpdate = createMockRes();
        await updateTrip(reqUpdate, resUpdate, () => {});

        assert.equal(resUpdate.statusCode, 200);
        assert.equal(mockTripDoc.travelers, 2);
        assert.equal(mockTripDoc.itinerary.estimatedCostPerPerson, 20000); // 40k / 2
        assert.equal(mockTripDoc.itinerary.breakdown[0].perPersonAmount, 8000); // 16k / 2
      } finally {
        Trip.findById = originalFindById;
      }
    } finally {
      Trip.create = originalCreate;
    }
  });

  await t.test('Acceptance 7: Legacy saved trips without travelers or dates remain readable and update properly', async () => {
    // Legacy document in DB from before Phase 1 (no travelers, no startDate)
    const legacyDoc = {
      _id: '654321098765432109876543',
      user: mockUser.id,
      destination: { id: 'jaipur', name: 'Jaipur' },
      duration: 3,
      budget: 15000,
      travelStyle: 'Balanced',
      itinerary: {
        tagline: 'Legacy trip',
        days: [{ dayNum: 1, dayTitle: 'Day 1', activities: [] }]
      },
      save: async function () { return this; }
    };

    const originalFindById = Trip.findById;
    Trip.findById = async () => legacyDoc;

    try {
      // 1. Read via getTripById
      const reqGet = {
        params: { id: '654321098765432109876543' },
        user: mockUser
      };
      const resGet = createMockRes();
      await getTripById(reqGet, resGet, () => {});

      assert.equal(resGet.statusCode, 200);
      assert.equal(resGet.body.data.destination.name, 'Jaipur');

      // 2. Update legacy trip to add travelers and startDate
      const reqUpdate = {
        params: { id: '654321098765432109876543' },
        user: mockUser,
        fetchFn: mockOfflineFetch,
        body: {
          travelers: 2,
          startDate: '2026-11-20T00:00:00Z'
        }
      };
      const resUpdate = createMockRes();
      await updateTrip(reqUpdate, resUpdate, () => {});

      assert.equal(resUpdate.statusCode, 200);
      assert.equal(legacyDoc.travelers, 2);
      assert.equal(legacyDoc.startDate.toISOString(), '2026-11-20T00:00:00.000Z');
      assert.equal(legacyDoc.endDate.toISOString(), '2026-11-22T00:00:00.000Z');
      assert.equal(legacyDoc.itinerary.estimatedCostPerPerson, 7500); // 15k / 2
    } finally {
      Trip.findById = originalFindById;
    }
  });
});
