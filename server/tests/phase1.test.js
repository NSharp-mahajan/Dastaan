/**
 * Phase 1 Test Suite: Backend Foundation, Data Contracts,
 * Factual Grounding & Itinerary Validation.
 *
 * Uses Node.js native test runner (node:test).
 * All external services (NVIDIA NIM, Nominatim, Overpass) are strictly mocked.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import Trip from '../src/models/Trip.js';
import { getNvidiaConfig, callNvidiaChat } from '../src/services/nvidiaClient.js';
import {
  verifyDestination,
  getVerifiedPoisForBoundingBox,
  verifyDestinationAndPois,
  mapOsmTagToCategory,
  clearGroundingCache,
  getOverpassEndpoints,
  OSM_ATTRIBUTION
} from '../src/services/groundingService.js';
import {
  normalizeTitle,
  getDistinctiveTokens,
  calculateJaccardSimilarity,
  parseTimeToMinutes,
  calculateHaversineKm,
  validateItinerary
} from '../src/services/validationService.js';
import {
  buildBudgetBreakdown,
  calculateTripDates,
  buildPromptInstructions,
  generateGroundedItinerary
} from '../src/services/itineraryService.js';

test('--- Phase 1: Trip Mongoose Schema & Compatibility ---', async (t) => {
  await t.test('instantiates trip with travelers and travel dates', () => {
    const trip = new Trip({
      user: '507f1f77bcf86cd799439011',
      destination: { id: 'tokyo', name: 'Tokyo', country: 'Japan' },
      duration: 4,
      travelers: 3,
      startDate: new Date('2026-12-01T00:00:00Z'),
      endDate: new Date('2026-12-04T00:00:00Z'),
      budget: 90000,
      itinerary: {
        tagline: 'A winter journey through Tokyo',
        estimatedCostPerPerson: 30000,
        breakdown: [
          { name: 'Accommodation', pct: 40, amount: 36000, perPersonAmount: 12000, color: '#D6B56D' }
        ],
        days: [
          {
            dayNum: 1,
            date: new Date('2026-12-01T00:00:00Z'),
            dayTitle: 'HISTORIC ASAKUSA',
            activities: [
              { time: '09:00', title: 'Senso-ji Temple', cat: 'CULTURE', poiId: 'osm_node_123' }
            ]
          }
        ]
      }
    });

    assert.equal(trip.travelers, 3);
    assert.equal(trip.startDate.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.equal(trip.itinerary.estimatedCostPerPerson, 30000);
    assert.equal(trip.itinerary.breakdown[0].perPersonAmount, 12000);
    assert.equal(trip.itinerary.days[0].activities[0].poiId, 'osm_node_123');
  });

  await t.test('maintains backward compatibility with legacy trips (defaults travelers to 1 and dates to null)', () => {
    const legacyTrip = new Trip({
      user: '507f1f77bcf86cd799439011',
      destination: { id: 'manali', name: 'Manali' },
      duration: 3,
      budget: 8000
    });

    assert.equal(legacyTrip.travelers, 1);
    assert.equal(legacyTrip.startDate, null);
    assert.equal(legacyTrip.endDate, null);
  });

  await t.test('rejects invalid travelers count (< 1 or > 20)', () => {
    const invalidZero = new Trip({
      user: '507f1f77bcf86cd799439011',
      destination: { id: 'jaipur', name: 'Jaipur' },
      duration: 3,
      travelers: 0,
      budget: 8000
    });
    const errZero = invalidZero.validateSync();
    assert.ok(errZero.errors.travelers);

    const invalidOver = new Trip({
      user: '507f1f77bcf86cd799439011',
      destination: { id: 'jaipur', name: 'Jaipur' },
      duration: 3,
      travelers: 25,
      budget: 8000
    });
    const errOver = invalidOver.validateSync();
    assert.ok(errOver.errors.travelers);
  });
});

test('--- Phase 1: Budget Semantics & Calculations ---', async (t) => {
  await t.test('calculates total-trip and per-person cost breakdown in INR', () => {
    // Total budget: ₹20,000 for 2 travellers
    const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(20000, 2);

    assert.equal(estimatedCostPerPerson, 10000);
    assert.equal(breakdown.length, 5);

    // Accommodation: 40% (₹8,000 total, ₹4,000/person)
    assert.equal(breakdown[0].name, 'Accommodation');
    assert.equal(breakdown[0].amount, 8000);
    assert.equal(breakdown[0].perPersonAmount, 4000);

    // Food: 25% (₹5,000 total, ₹2,500/person)
    assert.equal(breakdown[1].name, 'Food');
    assert.equal(breakdown[1].amount, 5000);
    assert.equal(breakdown[1].perPersonAmount, 2500);

    // Transport: 15% (₹3,000 total, ₹1,500/person)
    assert.equal(breakdown[2].name, 'Transport');
    assert.equal(breakdown[2].amount, 3000);
    assert.equal(breakdown[2].perPersonAmount, 1500);

    // Activities: 15% (₹3,000 total, ₹1,500/person)
    assert.equal(breakdown[3].name, 'Activities');
    assert.equal(breakdown[3].amount, 3000);
    assert.equal(breakdown[3].perPersonAmount, 1500);

    // Buffer: 5% (₹1,000 total, ₹500/person)
    assert.equal(breakdown[4].name, 'Buffer');
    assert.equal(breakdown[4].amount, 1000);
    assert.equal(breakdown[4].perPersonAmount, 500);
  });

  await t.test('enforces minimum budget threshold of ₹1,000', () => {
    const { estimatedCostPerPerson } = buildBudgetBreakdown(500, 1);
    assert.equal(estimatedCostPerPerson, 1000);
  });
});

test('--- Phase 1: Trip Calendar Date Calculations ---', async (t) => {
  await t.test('computes sequential calendar dates starting from startDate', () => {
    const { dates, startDate, endDate } = calculateTripDates('2026-11-10T00:00:00Z', 3);

    assert.equal(dates.length, 3);
    assert.equal(startDate.toISOString(), '2026-11-10T00:00:00.000Z');
    assert.equal(endDate.toISOString(), '2026-11-12T00:00:00.000Z');
  });

  await t.test('returns empty dates gracefully when startDate is omitted', () => {
    const { dates, startDate, endDate } = calculateTripDates(null, 5);
    assert.equal(dates.length, 0);
    assert.equal(startDate, null);
    assert.equal(endDate, null);
  });
});

test('--- Phase 1: NVIDIA NIM Client (Mocked) ---', async (t) => {
  await t.test('inspects configuration without exposing secrets', () => {
    const config = getNvidiaConfig();
    assert.ok(config.baseUrl);
    assert.ok(config.model);
    assert.equal(typeof config.temperature, 'number');
    assert.equal(typeof config.isKeyConfigured, 'boolean');
  });

  await t.test('rejects request if NVIDIA_API_KEY is missing', async () => {
    const originalKey = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;

    try {
      await callNvidiaChat({ messages: [{ role: 'user', content: 'test' }] });
      assert.fail('Should have thrown NVIDIA_KEY_MISSING');
    } catch (err) {
      assert.equal(err.code, 'NVIDIA_KEY_MISSING');
    } finally {
      if (originalKey) process.env.NVIDIA_API_KEY = originalKey;
    }
  });

  await t.test('sends correctly formatted payload to NVIDIA endpoint with mock fetch', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key-12345';

    let capturedUrl = null;
    let capturedOptions = null;

    const mockFetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;

      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'chatcmpl-test',
          model: 'meta/llama-3.3-70b-instruct',
          choices: [
            {
              message: {
                role: 'assistant',
                content: '{"tagline": "A verified journey", "days": []}'
              }
            }
          ],
          usage: { total_tokens: 120 }
        })
      };
    };

    const res = await callNvidiaChat({
      messages: [{ role: 'user', content: 'Plan a trip to Goa' }],
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
      fetchFn: mockFetch
    });

    assert.ok(capturedUrl.includes('/chat/completions'));
    assert.equal(capturedOptions.headers['Authorization'], 'Bearer mock-nvapi-key-12345');
    assert.ok(capturedOptions.headers['User-Agent']);

    const sentBody = JSON.parse(capturedOptions.body);
    assert.equal(sentBody.temperature, 0.1);
    assert.deepEqual(sentBody.response_format, { type: 'json_object' });
    assert.equal(res.content, '{"tagline": "A verified journey", "days": []}');
    assert.equal(res.requestId, 'chatcmpl-test');
    assert.equal(typeof res.durationMs, 'number');
  });

  await t.test('handles timeout and throws NVIDIA_TIMEOUT', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key-12345';

    const mockTimeoutFetch = async () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    };

    try {
      await callNvidiaChat({
        messages: [{ role: 'user', content: 'hello' }],
        fetchFn: mockTimeoutFetch
      });
      assert.fail('Should have thrown NVIDIA_TIMEOUT');
    } catch (err) {
      assert.equal(err.code, 'NVIDIA_TIMEOUT');
      assert.ok(err.message.includes('timed out'));
    }
  });

  await t.test('handles HTTP 500 error and throws NVIDIA_API_ERROR', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key-12345';

    const mockErrorFetch = async () => ({
      ok: false,
      status: 500,
      headers: { get: () => 'req-err-500' },
      json: async () => ({ error: 'Internal Server Error' })
    });

    try {
      await callNvidiaChat({
        messages: [{ role: 'user', content: 'hello' }],
        fetchFn: mockErrorFetch
      });
      assert.fail('Should have thrown NVIDIA_API_ERROR');
    } catch (err) {
      assert.equal(err.code, 'NVIDIA_API_ERROR');
      assert.equal(err.status, 500);
      assert.equal(err.requestId, 'req-err-500');
    }
  });

  await t.test('handles transient 429 rate limit and retries successfully', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key-12345';
    let callCount = 0;

    const mockRetryFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          headers: { get: (h) => (h === 'retry-after' ? '0' : 'req-429') },
          json: async () => ({ error: 'Rate limit exceeded' })
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'req-ok-200' },
        json: async () => ({
          choices: [{ message: { content: '{"status": "ok"}' } }]
        })
      };
    };

    const res = await callNvidiaChat({
      messages: [{ role: 'user', content: 'hello' }],
      fetchFn: mockRetryFetch
    });

    assert.equal(callCount, 2);
    assert.equal(res.content, '{"status": "ok"}');
  });

  await t.test('handles empty response and throws NVIDIA_EMPTY_CONTENT', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key-12345';

    const mockEmptyFetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'req-empty' },
      json: async () => ({
        choices: [{ message: { content: null, reasoning_content: null } }]
      })
    });

    try {
      await callNvidiaChat({
        messages: [{ role: 'user', content: 'hello' }],
        fetchFn: mockEmptyFetch
      });
      assert.fail('Should have thrown NVIDIA_EMPTY_CONTENT');
    } catch (err) {
      assert.equal(err.code, 'NVIDIA_EMPTY_CONTENT');
    }
  });
});

test('--- Phase 1: Destination & POI Grounding (Mocked) ---', async (t) => {
  t.beforeEach(() => {
    clearGroundingCache();
  });

  await t.test('Tier 1: verifyDestination resolves confirmed city with Nominatim mock', async () => {
    const mockNominatimFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          lat: '26.9124',
          lon: '75.7873',
          display_name: 'Jaipur, Rajasthan, India',
          boundingbox: ['26.78', '27.05', '75.68', '75.92'],
          address: { city: 'Jaipur', state: 'Rajasthan', country: 'India' }
        }
      ]
    });

    const result = await verifyDestination('Jaipur', { fetchFn: mockNominatimFetch });

    assert.equal(result.verified, true);
    assert.equal(result.name, 'Jaipur');
    assert.equal(result.country, 'India');
    assert.equal(result.lat, 26.9124);
    assert.equal(result.attribution, OSM_ATTRIBUTION);
  });

  await t.test('Tier 1: verifyDestination returns DESTINATION_NOT_FOUND for invalid city without defaulting', async () => {
    const mockEmptyFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => []
    });

    const result = await verifyDestination('NonExistentAtlantisPlace999', { fetchFn: mockEmptyFetch });

    assert.equal(result.verified, false);
    assert.equal(result.code, 'DESTINATION_NOT_FOUND');
    assert.ok(result.error.includes('could not be verified'));
  });

  await t.test('Tier 2: getVerifiedPoisForBoundingBox retrieves and categorizes Overpass POIs', async () => {
    const mockOverpassFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          {
            type: 'node',
            id: 101,
            lat: 26.9855,
            lon: 75.8513,
            tags: { name: 'Amer Fort', historic: 'castle' }
          },
          {
            type: 'node',
            id: 102,
            lat: 26.9239,
            lon: 75.8267,
            tags: { name: 'Albert Hall Museum', tourism: 'museum' }
          },
          {
            type: 'node',
            id: 103,
            lat: 26.9150,
            lon: 75.8180,
            tags: { name: 'Central Park', leisure: 'park' }
          }
        ]
      })
    });

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [26.78, 27.05, 75.68, 75.92],
      destinationKey: 'jaipur-test',
      fetchFn: mockOverpassFetch
    });

    assert.equal(result.verified, true);
    assert.equal(result.count, 3);
    assert.equal(result.pois[0].name, 'Amer Fort');
    assert.equal(result.pois[0].category, 'HISTORY');
    assert.equal(result.pois[1].name, 'Albert Hall Museum');
    assert.equal(result.pois[1].category, 'CULTURE');
    assert.equal(result.pois[2].name, 'Central Park');
    assert.equal(result.pois[2].category, 'NATURE');
    assert.ok(result.pois[0].operationalStatusNote.includes('physically verified in OpenStreetMap'));
  });

  await t.test('maps OSM tags to Dastaan categories accurately', () => {
    assert.equal(mapOsmTagToCategory({ historic: 'monument' }), 'HISTORY');
    assert.equal(mapOsmTagToCategory({ tourism: 'museum' }), 'CULTURE');
    assert.equal(mapOsmTagToCategory({ leisure: 'park' }), 'NATURE');
    assert.equal(mapOsmTagToCategory({ amenity: 'marketplace' }), 'SHOPPING');
    assert.equal(mapOsmTagToCategory({ amenity: 'restaurant' }), 'FOOD');
  });

  await t.test('Tier 2: fails over to secondary mirror when primary mirror returns HTTP 502', async () => {
    const calledUrls = [];

    const mockFailoverFetch = async (url) => {
      calledUrls.push(url);
      if (url.includes('overpass-api.de')) {
        return {
          ok: false,
          status: 502,
          headers: { get: () => null }
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              type: 'node',
              id: 201,
              lat: 28.6139,
              lon: 77.2090,
              tags: { name: 'India Gate', tourism: 'attraction' }
            }
          ]
        })
      };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [28.5, 28.7, 77.1, 77.3],
      destinationKey: 'delhi-failover-test',
      fetchFn: mockFailoverFetch
    });

    assert.equal(result.verified, true);
    assert.equal(result.count, 1);
    assert.equal(result.pois[0].name, 'India Gate');
    assert.ok(calledUrls.some(u => u.includes('overpass-api.de')), 'Must have attempted primary endpoint');
    assert.ok(calledUrls.some(u => u.includes('kumi.systems') || u.includes('mail.ru')), 'Must have failed over to secondary mirror');
  });

  await t.test('Tier 2: returns structured POI_SERVICE_UNAVAILABLE when all Overpass mirrors fail', async () => {
    const mockAllFailedFetch = async (url) => ({
      ok: false,
      status: 502,
      headers: { get: () => null }
    });

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [10.0, 10.2, 76.0, 76.2],
      destinationKey: 'unreachable-mirror-test',
      fetchFn: mockAllFailedFetch
    });

    assert.equal(result.verified, false);
    assert.equal(result.code, 'POI_SERVICE_UNAVAILABLE');
    assert.equal(result.retryable, true);
    assert.ok(result.error.includes('temporarily unavailable'));
  });

  await t.test('Tier 2: handles endpoint timeout and fails over gracefully', async () => {
    const calledUrls = [];

    const mockTimeoutThenSuccessFetch = async (url) => {
      calledUrls.push(url);
      if (url.includes('overpass-api.de')) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              type: 'node',
              id: 301,
              lat: 32.2396,
              lon: 77.1887,
              tags: { name: 'Solang Valley', tourism: 'attraction' }
            }
          ]
        })
      };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [32.1, 32.3, 77.0, 77.3],
      destinationKey: 'manali-timeout-test',
      fetchFn: mockTimeoutThenSuccessFetch
    });

    assert.equal(result.verified, true);
    assert.equal(result.pois[0].name, 'Solang Valley');
  });

  await t.test('Tier 2: serves subsequent requests from cache without contacting network mirrors', async () => {
    let networkCalls = 0;

    const mockCountingFetch = async () => {
      networkCalls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              type: 'node',
              id: 401,
              lat: 31.9,
              lon: 77.2,
              tags: { name: 'Chalal Pine Walk', tourism: 'attraction' }
            }
          ]
        })
      };
    };

    // First call: populates cache
    const res1 = await getVerifiedPoisForBoundingBox({
      boundingbox: [31.8, 32.0, 77.1, 77.3],
      destinationKey: 'kasol-cache-test',
      fetchFn: mockCountingFetch
    });
    assert.equal(res1.verified, true);
    assert.equal(networkCalls, 1);

    // Second call: must hit cache
    const res2 = await getVerifiedPoisForBoundingBox({
      boundingbox: [31.8, 32.0, 77.1, 77.3],
      destinationKey: 'kasol-cache-test',
      fetchFn: mockCountingFetch
    });
    assert.equal(res2.verified, true);
    assert.equal(networkCalls, 1, 'Network call count must remain 1 due to cache hit');
  });

  await t.test('Tier 2: progressively narrows to Level 2 (node-only) when Level 1 returns 504 Gateway Timeout', async () => {
    let callAttempts = 0;
    const recordedBodies = [];

    const mock504ThenSuccessFetch = async (url, options) => {
      callAttempts++;
      recordedBodies.push(options?.body || '');
      if (callAttempts === 1) {
        return {
          ok: false,
          status: 504,
          headers: { get: () => null }
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              type: 'node',
              id: 501,
              lat: 31.95,
              lon: 77.25,
              tags: { name: 'Kasol Market', tourism: 'attraction' }
            }
          ]
        })
      };
    };

    const res = await getVerifiedPoisForBoundingBox({
      boundingbox: [31.9, 32.0, 77.2, 77.3],
      destinationKey: 'kasol-narrowing-test',
      lat: 31.95,
      lon: 77.25,
      fetchFn: mock504ThenSuccessFetch
    });

    assert.equal(res.verified, true);
    assert.equal(res.count, 1);
    assert.equal(callAttempts, 2, 'Should have retried with Level 2 on same endpoint after 504');
    assert.ok(recordedBodies[0].includes('way%5B%22tourism'), 'Attempt 1 had ways in query');
    assert.ok(!recordedBodies[1].includes('way%5B%22tourism'), 'Attempt 2 excluded ways (node-only narrowing)');
  });

  await t.test('Tier 2: honors OVERPASS_HOSTED_URL as highest priority mirror', () => {
    const origHosted = process.env.OVERPASS_HOSTED_URL;
    process.env.OVERPASS_HOSTED_URL = 'https://custom-overpass.example.com/api/interpreter';
    const endpoints = getOverpassEndpoints();
    assert.equal(endpoints[0], 'https://custom-overpass.example.com/api/interpreter');
    if (origHosted) {
      process.env.OVERPASS_HOSTED_URL = origHosted;
    } else {
      delete process.env.OVERPASS_HOSTED_URL;
    }
  });

  await t.test('Tier 2: rejects invalid out-of-range coordinates with INVALID_COORDINATES', async () => {
    const res = await getVerifiedPoisForBoundingBox({
      boundingbox: [120, 130, 200, 210],
      destinationKey: 'invalid-coords-test'
    });
    assert.equal(res.verified, false);
    assert.equal(res.code, 'INVALID_COORDINATES');
  });

  await t.test('Tier 1: keeps Spiti Valley instead of collapsing to Himachal Pradesh', async () => {
    const mockNominatimFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          lat: '32.24',
          lon: '78.03',
          name: 'Himachal Pradesh',
          display_name: 'Spiti Valley, Lahaul and Spiti, Himachal Pradesh, India',
          boundingbox: ['31.9', '32.8', '77.5', '78.6'],
          address: { state: 'Himachal Pradesh', country: 'India' }
        }
      ]
    });

    const result = await verifyDestination('Spiti Valley', { fetchFn: mockNominatimFetch });
    assert.equal(result.verified, true);
    assert.equal(result.name, 'Spiti Valley');
    assert.equal(result.originalQuery, 'Spiti Valley');
    assert.equal(result.country, 'India');
  });

  await t.test('Tier 2: Spiti Valley uses heritage catalog when every Overpass mirror returns 502', async () => {
    const mockDownFetch = async (url) => {
      if (String(url).includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              lat: '32.24',
              lon: '78.03',
              name: 'Himachal Pradesh',
              display_name: 'Spiti Valley, Himachal Pradesh, India',
              boundingbox: ['31.9', '32.8', '77.5', '78.6'],
              address: { state: 'Himachal Pradesh', country: 'India' }
            }
          ]
        };
      }
      return { ok: false, status: 502, headers: { get: () => null } };
    };

    const result = await verifyDestinationAndPois('Spiti Valley', { fetchFn: mockDownFetch });
    assert.equal(result.verified, true);
    assert.equal(result.destination.name, 'Spiti Valley');
    assert.equal(result.provider, 'dastaan-heritage-archive');
    assert.ok(result.count >= 3);
    assert.ok(result.pois.some((p) => /monastery|gompa|lake/i.test(p.name)));
  });
});

test('--- Phase 1: Itinerary Quality & Feasibility Validation ---', async (t) => {
  await t.test('detects and rejects duplicate POIs with stable poiId collision', () => {
    const invalidItin = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'DAY 1',
          activities: [
            { time: '09:00', title: 'Amer Fort', cat: 'HISTORY', poiId: 'osm_node_101' },
            { time: '13:00', title: 'Hawa Mahal', cat: 'CULTURE', poiId: 'osm_node_102' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'DAY 2',
          activities: [
            // Duplicate POI ID
            { time: '09:00', title: 'Amber Fortress', cat: 'HISTORY', poiId: 'osm_node_101' },
            { time: '14:00', title: 'City Palace', cat: 'CULTURE', poiId: 'osm_node_104' }
          ]
        }
      ]
    };

    const result = validateItinerary(invalidItin, { expectedDays: 2 });
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('shares stable POI ID "osm_node_101"')));
  });

  await t.test('detects duplicate venue names across different days', () => {
    const invalidItin = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'DAY 1',
          activities: [
            { time: '09:00', title: 'Senso-ji Temple', cat: 'CULTURE' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'DAY 2',
          activities: [
            // Exact same name
            { time: '09:00', title: 'Senso-ji Temple', cat: 'CULTURE' }
          ]
        }
      ]
    };

    const result = validateItinerary(invalidItin, { expectedDays: 2 });
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Duplicate venue name detected')));
  });

  await t.test('detects high-confidence alias collision (e.g. Amer Fort vs Amer Fort Palace)', () => {
    const sim = calculateJaccardSimilarity('Amer Fort', 'Amer Fort Palace');
    assert.ok(sim >= 0.65);
  });

  await t.test('detects chronological ordering violations within a day', () => {
    const outOfOrderItin = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'DAY 1',
          activities: [
            { time: '14:00', title: 'Afternoon Market', cat: 'SHOPPING' },
            { time: '09:00', title: 'Morning Temple', cat: 'CULTURE' } // 09:00 after 14:00
          ]
        }
      ]
    };

    const result = validateItinerary(outOfOrderItin, { expectedDays: 1 });
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('violates chronological order')));
  });

  await t.test('detects day count mismatch (missing days)', () => {
    const incompleteItin = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'DAY 1',
          activities: [{ time: '09:00', title: 'Fort', cat: 'HISTORY' }]
        }
      ]
    };

    const result = validateItinerary(incompleteItin, { expectedDays: 3 });
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Day count mismatch: Expected 3 days, but itinerary has 1 days.')));
  });

  await t.test('passes valid, grounded, non-repeating itinerary', () => {
    const validItin = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'ROYAL HERITAGE',
          activities: [
            { time: '09:00', title: 'Amer Fort', cat: 'HISTORY', poiId: 'osm_101' },
            { time: '13:00', title: 'Hawa Mahal', cat: 'CULTURE', poiId: 'osm_102' },
            { time: '16:30', title: 'Johari Bazaar', cat: 'SHOPPING', poiId: 'osm_103' }
          ]
        },
        {
          dayNum: 2,
          dayTitle: 'PALACES AND GARDENS',
          activities: [
            { time: '09:30', title: 'City Palace', cat: 'CULTURE', poiId: 'osm_104' },
            { time: '13:30', title: 'Albert Hall Museum', cat: 'HISTORY', poiId: 'osm_105' },
            { time: '17:00', title: 'Nahargarh Fort Sunset', cat: 'RELAX', poiId: 'osm_106' }
          ]
        }
      ]
    };

    const result = validateItinerary(validItin, { expectedDays: 2, travelStyle: 'Balanced' });
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
  });
});

test('--- Phase 1: End-to-End Itinerary Generation Pipeline (Mocked) ---', async (t) => {
  t.beforeEach(() => {
    clearGroundingCache();
  });

  await t.test('generates grounded, non-repeating itinerary with dates and per-person costs', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key';

    const mockFetch = async (url) => {
      // Nominatim Mock
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              lat: '26.9124',
              lon: '75.7873',
              display_name: 'Jaipur, Rajasthan, India',
              boundingbox: ['26.78', '27.05', '75.68', '75.92'],
              address: { city: 'Jaipur', state: 'Rajasthan', country: 'India' }
            }
          ]
        };
      }

      // Overpass Mock
      if (url.includes('overpass-api.de')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [
              { type: 'node', id: 1, tags: { name: 'Amer Fort', historic: 'castle' } },
              { type: 'node', id: 2, tags: { name: 'Hawa Mahal', tourism: 'attraction' } },
              { type: 'node', id: 3, tags: { name: 'City Palace', tourism: 'museum' } },
              { type: 'node', id: 4, tags: { name: 'Albert Hall', tourism: 'gallery' } }
            ]
          })
        };
      }

      // NVIDIA Chat Completion Mock
      if (url.includes('/chat/completions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    tagline: 'A royal journey through the Pink City.',
                    overview: 'Balanced pacing through Jaipur landmarks.',
                    days: [
                      {
                        dayNum: 1,
                        dayTitle: 'DAY 1: ROYAL FORTS',
                        activities: [
                          { time: '09:00', title: 'Amer Fort', cat: 'HISTORY', poiId: 'osm_node_1' },
                          { time: '13:00', title: 'Hawa Mahal', cat: 'CULTURE', poiId: 'osm_node_2' }
                        ]
                      },
                      {
                        dayNum: 2,
                        dayTitle: 'DAY 2: MUSEUMS & PALACES',
                        activities: [
                          { time: '09:30', title: 'City Palace', cat: 'CULTURE', poiId: 'osm_node_3' },
                          { time: '14:00', title: 'Albert Hall', cat: 'CULTURE', poiId: 'osm_node_4' }
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

      throw new Error(`Unexpected unmocked URL in test: ${url}`);
    };

    const tripResult = await generateGroundedItinerary(
      {
        destination: { name: 'Jaipur', country: 'India' },
        duration: 2,
        budget: 16000,
        travelers: 2,
        startDate: '2026-12-05T00:00:00Z',
        travelStyle: 'Balanced',
        interests: ['History', 'Culture']
      },
      { fetchFn: mockFetch }
    );

    assert.equal(tripResult.duration, 2);
    assert.equal(tripResult.travelers, 2);
    assert.equal(tripResult.budget, 16000);
    assert.equal(tripResult.itinerary.estimatedCostPerPerson, 8000);
    assert.equal(tripResult.startDate.toISOString(), '2026-12-05T00:00:00.000Z');
    assert.equal(tripResult.itinerary.days.length, 2);

    // Verify day dates
    assert.equal(tripResult.itinerary.days[0].date.toISOString(), '2026-12-05T00:00:00.000Z');
    assert.equal(tripResult.itinerary.days[1].date.toISOString(), '2026-12-06T00:00:00.000Z');

    // Verify alternating layouts attached
    assert.equal(tripResult.itinerary.days[0].activities[0].layout, 'image-right');
    assert.equal(tripResult.itinerary.days[0].activities[1].layout, 'image-left');

    // Verify non-repetition across days
    const day1Venues = tripResult.itinerary.days[0].activities.map(a => a.title);
    const day2Venues = tripResult.itinerary.days[1].activities.map(a => a.title);
    for (const v of day1Venues) {
      assert.equal(day2Venues.includes(v), false);
    }
  });

  await t.test('throws DESTINATION_NOT_FOUND when city cannot be verified without falling back to Delhi', async () => {
    const mockUnknownFetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return { ok: true, status: 200, json: async () => [] };
      }
      throw new Error('Overpass or LLM should not be called when city is unknown');
    };

    try {
      await generateGroundedItinerary(
        { destination: { name: 'FictionalCityXYZ' }, duration: 2 },
        { fetchFn: mockUnknownFetch }
      );
      assert.fail('Should have thrown DESTINATION_NOT_FOUND');
    } catch (err) {
      assert.equal(err.code, 'DESTINATION_NOT_FOUND');
      assert.ok(err.message.includes('could not be verified'));
    }
  });
});
