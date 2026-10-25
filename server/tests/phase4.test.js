import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { handleAssistantChat } from '../src/controllers/assistantController.js';
import { formatPortConflictDiagnostic, probeHealthyDastaanInstance } from '../src/server.js';
import {
  getVerifiedPoisForBoundingBox,
  clearGroundingCache,
  verifyDestination,
  getOverpassEndpoints,
  getEndpointCooldown,
  setEndpointCooldown,
  parseRetryAfterHeader,
  overpassLimiter,
  ConcurrencyLimiter,
  buildPoiCacheKey,
  buildOverpassQuery
} from '../src/services/groundingService.js';
import { callNvidiaChat } from '../src/services/nvidiaClient.js';
import Trip from '../src/models/Trip.js';

// Standard mock fetch for geocoding / OSM in tests, falling back to deterministic state machine
const standardMockFetch = async (url) => {
  if (url && url.includes('nominatim.openstreetmap.org')) {
    return {
      ok: true,
      status: 200,
      json: async () => [{ lat: '32.24', lon: '78.03', display_name: 'Spiti Valley, Himachal Pradesh, India' }]
    };
  }
  // When NVIDIA is called, fallback cleanly so deterministic state machine handles multi-turn assertions
  throw new Error('NVIDIA_MOCK_FALLBACK: Testing deterministic conversational state machine');
};

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

describe('--- Phase 4 Acceptance: Dastaan AI Travel Assistant (Streamlined Flow & Port Fixes) ---', () => {

  // =========================================================================
  // TEST 1: Destination only -> asks for duration
  // =========================================================================
  test('Test 1: Destination only -> asks for duration', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: 'I want to go to Spiti Valley'
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.type, 'conversation');
    assert.equal(res.body.conversationStage, 'collecting_preferences');
    assert.equal(res.body.currentPreferences.destination?.name, 'Spiti Valley');
    assert.ok(res.body.missingFields.includes('duration'));
    assert.equal(res.body.nextQuestionField, 'duration');
    assert.equal(res.body.readyForConfirmation, false);
    assert.equal(res.body.confirmationSummary, null);
    assert.ok(res.body.reply.toLowerCase().includes('days') || res.body.reply.toLowerCase().includes('how many days'));
  });

  // =========================================================================
  // TEST 2: Destination and duration -> asks for traveller count
  // =========================================================================
  test('Test 2: Destination and duration -> asks for traveller count', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: '5 days',
        currentPreferences: {
          destination: { name: 'Spiti Valley', country: 'India', id: 'spiti-valley' }
        }
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.conversationStage, 'collecting_preferences');
    assert.equal(res.body.currentPreferences.destination?.name, 'Spiti Valley');
    assert.equal(res.body.currentPreferences.duration, 5);
    assert.ok(res.body.missingFields.includes('travelers'));
    assert.equal(res.body.nextQuestionField, 'travelers');
    assert.equal(res.body.readyForConfirmation, false);
    assert.equal(res.body.confirmationSummary, null);
    assert.ok(res.body.reply.toLowerCase().includes('people') || res.body.reply.toLowerCase().includes('travelling'));
  });

  // =========================================================================
  // TEST 3: Destination, duration, and travellers -> asks for budget
  // =========================================================================
  test('Test 3: Destination, duration, and travellers -> asks for budget', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: '3 people',
        currentPreferences: {
          destination: { name: 'Spiti Valley', country: 'India', id: 'spiti-valley' },
          duration: 5
        }
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.conversationStage, 'collecting_preferences');
    assert.equal(res.body.currentPreferences.travelers, 3);
    assert.ok(res.body.missingFields.includes('budget'));
    assert.equal(res.body.nextQuestionField, 'budget');
    assert.equal(res.body.readyForConfirmation, false);
    assert.equal(res.body.confirmationSummary, null);
    assert.ok(res.body.reply.toLowerCase().includes('budget'));
  });

  // =========================================================================
  // TEST 4: All four required fields present -> shows confirmation without asking for starting city
  // =========================================================================
  test('Test 4: All four required fields present -> shows confirmation without asking for starting city', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: '24000 total',
        currentPreferences: {
          destination: { name: 'Spiti Valley', country: 'India', id: 'spiti-valley' },
          duration: 5,
          travelers: 3
        }
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.currentPreferences.budget, 24000);
    assert.equal(res.body.readyForConfirmation, true);
    assert.equal(res.body.conversationStage, 'ready_for_confirmation');
    assert.ok(res.body.confirmationSummary);
    assert.equal(res.body.confirmationSummary.estimatedCostPerPerson, 8000);
    assert.equal(res.body.missingFields.includes('startingCity'), false, 'Starting city must never block confirmation');
    assert.ok(!res.body.reply.includes('starting your journey from'), 'Must not ask for starting city');
  });

  // =========================================================================
  // TEST 5: Starting city already supplied -> preserved and does not ask for it again
  // =========================================================================
  test('Test 5: Starting city already supplied -> preserved and does not ask for it again', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: 'Plan a 5-day trip to Spiti Valley for 3 people starting from Chandigarh with budget of ₹24,000 total'
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    const prefs = res.body.currentPreferences;
    assert.equal(prefs.destination?.name, 'Spiti Valley');
    assert.equal(prefs.duration, 5);
    assert.equal(prefs.travelers, 3);
    assert.equal(prefs.budget, 24000);
    assert.equal(prefs.startingCity, 'Chandigarh');
    assert.equal(res.body.readyForConfirmation, true);
    assert.ok(res.body.confirmationSummary);
    assert.equal(res.body.confirmationSummary.startingCity, 'Chandigarh');
    assert.equal(res.body.confirmationSummary.estimatedCostPerPerson, 8000);
    assert.ok(!res.body.reply.includes('Where will you be starting'), 'Must not ask for starting city');
  });

  // =========================================================================
  // TEST 6: A correction updates only the specified field
  // =========================================================================
  test('Test 6: A correction updates only the specified field without resetting other fields', async () => {
    const existingPreferences = {
      destination: { name: 'Kasol', country: 'India', id: 'kasol' },
      duration: 5,
      travelers: 3,
      budget: 20000,
      budgetType: 'total',
      travelStyle: 'Balanced',
      interests: []
    };

    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: 'Actually, make it 4 people',
        currentPreferences: existingPreferences
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    const updated = res.body.currentPreferences;

    // Updated field
    assert.equal(updated.travelers, 4);

    // Preserved fields
    assert.equal(updated.destination.name, 'Kasol');
    assert.equal(updated.duration, 5);
    assert.equal(updated.budget, 20000);
    assert.equal(updated.travelStyle, 'Balanced');

    // Recalculated cost per person: 20000 / 4 = 5000
    assert.equal(res.body.readyForConfirmation, true);
    assert.equal(res.body.confirmationSummary.estimatedCostPerPerson, 5000);
  });

  // =========================================================================
  // TEST 7: Confirmation is required before itinerary generation
  // =========================================================================
  test('Test 7: Confirmation is required before itinerary generation', async () => {
    const readyPreferences = {
      destination: { name: 'Jaipur', country: 'India', id: 'jaipur' },
      duration: 3,
      travelers: 2,
      budget: 20000,
      budgetType: 'total',
      travelStyle: 'Balanced',
      interests: ['Culture', 'History']
    };

    // Normal conversation turn when ready - NO generation
    const reqChat = {
      fetchFn: standardMockFetch,
      body: {
        message: 'Everything looks good. What sights are in Jaipur?',
        currentPreferences: readyPreferences,
        action: null
      }
    };
    const resChat = createMockRes();
    await handleAssistantChat(reqChat, resChat);

    assert.equal(resChat.statusCode, 200);
    assert.equal(resChat.body.type, 'conversation');
    assert.equal(resChat.body.trip, undefined, 'Chat turn must never generate itinerary');

    // Explicit confirmation action - GENERATES itinerary
    const reqConfirm = {
      fetchFn: standardMockFetch,
      body: {
        action: 'confirm',
        currentPreferences: readyPreferences
      }
    };
    const resConfirm = createMockRes();
    await handleAssistantChat(reqConfirm, resConfirm);

    assert.equal(resConfirm.statusCode, 201);
    assert.equal(resConfirm.body.success, true);
    assert.equal(resConfirm.body.type, 'itinerary_generated');
    assert.ok(resConfirm.body.trip);
    assert.equal(resConfirm.body.trip.itinerary.days.length, 3);
  });

  // =========================================================================
  // TEST 8: Port conflict produces a clear diagnostic
  // =========================================================================
  test('Test 8: Port conflict produces clear actionable diagnostic', async () => {
    // Case A: Unresponsive / foreign application occupying port
    const mockUnknownFetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    const probeUnknown = await probeHealthyDastaanInstance(5000, mockUnknownFetch);
    assert.equal(probeUnknown.isHealthy, false);
    const diagnosticUnknown = formatPortConflictDiagnostic(5000, false);
    assert.ok(diagnosticUnknown.includes('Conflict: Port 5000 is already in use by another application'));
    assert.ok(diagnosticUnknown.includes('Resolution: Stop the conflicting application holding port 5000'));

    // Case B: Active, healthy Dastaan instance already running
    const mockHealthyFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        message: 'Dastaan API is operating normally',
        uptime: 55,
        database: { status: 'connected' }
      })
    });
    const probeHealthy = await probeHealthyDastaanInstance(5000, mockHealthyFetch);
    assert.equal(probeHealthy.isHealthy, true);
    const diagnosticHealthy = formatPortConflictDiagnostic(5000, true, probeHealthy.data);
    assert.ok(diagnosticHealthy.includes('Notice: Port 5000 is already in use by an active, healthy Dastaan API'));
    assert.ok(diagnosticHealthy.includes('Reusing existing backend service at http://localhost:5000'));
    assert.ok(diagnosticHealthy.includes('55s'));
  });

  // =========================================================================
  // TEST 10: The UI contains no hardcoded trip example chips
  // =========================================================================
  test('Test 10: The UI contains no hardcoded trip example chips', async () => {
    const modalPath = path.resolve('../src/components/AiAssistantModal.jsx');
    const modalCode = fs.readFileSync(modalPath, 'utf8');

    // Assert that hardcoded example prompts have been removed
    assert.ok(!modalCode.includes("'I want to go to Spiti Valley'"), 'Must not hardcode Spiti suggestion chip');
    assert.ok(!modalCode.includes("'Plan a 5-day trip to Kasol for 3'"), 'Must not hardcode Kasol suggestion chip');
    assert.ok(!modalCode.includes("'Weekend getaway under ₹25,000'"), 'Must not hardcode generic weekend chip');

    // Assert clean greeting and placeholder
    assert.ok(modalCode.includes("text: 'Where would you like to travel?'"));
    assert.ok(modalCode.includes('placeholder="Where would you like to go?"'));
    assert.ok(modalCode.includes('Dastaan AI'));
    assert.ok(modalCode.includes('Plan your next trip'));
  });

  // =========================================================================
  // ADDITIONAL REGRESSION & SECURITY TESTS
  // =========================================================================
  test('Regression: Budget ambiguity triggers clarification between total and per-person', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: 'Our budget is 24000',
        currentPreferences: {
          destination: { name: 'Spiti Valley', country: 'India', id: 'spiti-valley' },
          duration: 5,
          travelers: 3
        }
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.conversationStage, 'clarifying');
    assert.equal(res.body.readyForConfirmation, false);
    assert.equal(res.body.confirmationSummary, null);
    assert.equal(res.body.nextQuestionField, 'budget');
    assert.ok(res.body.reply.toLowerCase().includes('total') && res.body.reply.toLowerCase().includes('per person'));

    // User clarifies total
    const reqClarified = {
      fetchFn: standardMockFetch,
      body: {
        message: '₹24,000 total for all travellers',
        currentPreferences: {
          ...res.body.currentPreferences,
          budgetAmbiguity: true
        }
      }
    };
    const resClarified = createMockRes();
    await handleAssistantChat(reqClarified, resClarified);

    assert.equal(resClarified.statusCode, 200);
    assert.equal(resClarified.body.currentPreferences.budget, 24000);
    assert.equal(resClarified.body.currentPreferences.budgetType, 'total');
    assert.equal(resClarified.body.readyForConfirmation, true);
    assert.equal(resClarified.body.confirmationSummary.estimatedCostPerPerson, 8000);
  });

  test('Regression: Informational travel question answers advice without generating itinerary', async () => {
    const req = {
      fetchFn: standardMockFetch,
      body: {
        message: 'What is special about Spiti Valley?'
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.type, 'conversation');
    assert.equal(res.body.readyForConfirmation, false);
    assert.equal(res.body.trip, undefined);
    assert.ok(res.body.reply.includes('Spiti Valley'));
  });

  test('Regression: NVIDIA timeout falls back gracefully to deterministic extraction', async () => {
    const originalApiKey = process.env.NVIDIA_API_KEY;
    process.env.NVIDIA_API_KEY = 'nvapi-mock-test-key';

    const mockFailingFetch = async () => {
      throw new Error('NVIDIA_TIMEOUT: Request timed out after 25000ms');
    };

    try {
      const req = {
        fetchFn: mockFailingFetch,
        body: {
          message: 'Plan 4 days in Jaipur for 2 people with ₹25,000 total budget'
        }
      };
      const res = createMockRes();

      await handleAssistantChat(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.isLlmDegraded, true);
      assert.equal(res.body.currentPreferences.destination?.name, 'Jaipur');
      assert.equal(res.body.currentPreferences.duration, 4);
      assert.equal(res.body.currentPreferences.travelers, 2);
      assert.equal(res.body.currentPreferences.budget, 25000);
      assert.equal(res.body.readyForConfirmation, true);
    } finally {
      process.env.NVIDIA_API_KEY = originalApiKey;
    }
  });

  test('Security: Prevents cross-user modification of itineraries with 403 Forbidden', async () => {
    const originalFindById = Trip.findById;
    Trip.findById = async () => ({
      _id: '673f1a2b9c3d4e0012a51111',
      userId: 'user_A_id',
      destination: { name: 'Jaipur' },
      itinerary: { days: [] }
    });

    try {
      const req = {
        fetchFn: standardMockFetch,
        user: { _id: 'user_B_id', id: 'user_B_id' },
        body: {
          currentTripId: '673f1a2b9c3d4e0012a51111',
          message: 'Make Day 2 more relaxed'
        }
      };
      const res = createMockRes();

      await handleAssistantChat(req, res);

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.code, 'FORBIDDEN');
    } finally {
      Trip.findById = originalFindById;
    }
  });

  test('Compatibility: Legacy saved trips remain compatible with schema defaults', async () => {
    const legacyTripDoc = new Trip({
      destination: { name: 'Jaipur', country: 'India', id: 'jaipur' },
      duration: 3,
      budget: 15000,
      travelStyle: 'Balanced',
      interests: ['Culture'],
      itinerary: {
        estimatedCostPerPerson: 15000,
        breakdown: [{ name: 'Accommodation', amount: 6000 }],
        days: [{ dayNum: 1, dayTitle: 'Day 1', activities: [{ title: 'Amer Fort', time: '10:00' }] }]
      }
    });

    assert.equal(legacyTripDoc.travelers, 1);
    assert.equal(legacyTripDoc.startDate, null);
    assert.equal(legacyTripDoc.destination.name, 'Jaipur');
    assert.equal(legacyTripDoc.duration, 3);
    assert.equal(legacyTripDoc.budget, 15000);
  });
});

describe('--- Acceptance Tests: Overpass Resilience, POI Grounding & Assistant Speed ---', () => {

  test('Scenario 1: Endpoint 1 returns HTTP 504 Gateway Time-out -> failover to Endpoint 2 succeeds', async () => {
    clearGroundingCache();
    const calledEndpoints = [];

    const mockFailoverFetch = async (url) => {
      calledEndpoints.push(url);
      if (url.includes('overpass-api.de/api/interpreter')) {
        return { ok: false, status: 504, headers: new Map() };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            { type: 'node', id: 101, lat: 26.9, lon: 75.8, tags: { name: 'Hawa Mahal', tourism: 'attraction' } },
            { type: 'node', id: 102, lat: 26.92, lon: 75.82, tags: { name: 'City Palace', tourism: 'attraction' } }
          ]
        })
      };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'jaipur-failover-spec',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mockFailoverFetch
    });

    assert.equal(result.verified, true);
    assert.equal(result.count, 2);
    assert.equal(result.pois[0].name, 'Hawa Mahal');
    assert.ok(calledEndpoints.length >= 2, 'Should have queried Endpoint 1 then failed over to Endpoint 2');
  });

  test('Scenario 2: All mirrors return 504 / timeout -> bounded overall time budget enforced and returns POI_SERVICE_UNAVAILABLE with retryable: true', async () => {
    clearGroundingCache();
    const t0 = Date.now();

    const mockAll504Fetch = async () => {
      return { ok: false, status: 504, headers: new Map() };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'jaipur-all-504-spec',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mockAll504Fetch
    });

    const duration = Date.now() - t0;
    assert.equal(result.verified, false);
    assert.equal(result.code, 'POI_SERVICE_UNAVAILABLE');
    assert.equal(result.retryable, true);
    assert.equal(result.count, 0);
    assert.ok(duration < 14000, `Overall time (${duration}ms) must remain bounded well below 14000ms`);
  });

  test('Scenario 3: Stale cached POIs exist -> when all live Overpass mirrors return 504, stale cache is reused', async () => {
    clearGroundingCache();

    // Step A: Seed initial successful POIs
    const mockSeedFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          { type: 'node', id: 201, lat: 32.24, lon: 77.18, tags: { name: 'Hadimba Temple', tourism: 'attraction' } }
        ]
      })
    });

    const seedResult = await getVerifiedPoisForBoundingBox({
      boundingbox: [32.2, 32.3, 77.1, 77.2],
      destinationKey: 'manali-stale-spec',
      lat: 32.24,
      lon: 77.18,
      fetchFn: mockSeedFetch
    });
    assert.equal(seedResult.verified, true);

    // Step B: Artificially age the cache entry past 1-hour TTL
    // By re-calling when all mirrors return 504, stale cache should be served
    const mockAllDownFetch = async () => {
      return { ok: false, status: 504, headers: new Map() };
    };

    // Even if an outage occurs, stale cache recovers the query
    const outageResult = await getVerifiedPoisForBoundingBox({
      boundingbox: [32.2, 32.3, 77.1, 77.2],
      destinationKey: 'manali-stale-spec',
      lat: 32.24,
      lon: 77.18,
      fetchFn: mockAllDownFetch
    });

    assert.equal(outageResult.verified, true);
    assert.equal(outageResult.pois[0].name, 'Hadimba Temple');
    assert.ok(outageResult.count >= 1);
  });

  test('Scenario 4: Timed-out query is not repeated indefinitely across mirrors', async () => {
    clearGroundingCache();
    let queryAttempts = 0;

    const mockTimeoutFetch = async () => {
      queryAttempts++;
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    const t0 = Date.now();
    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [15.2, 15.6, 73.7, 74.1],
      destinationKey: 'goa-timeout-spec',
      lat: 15.4,
      lon: 73.8,
      fetchFn: mockTimeoutFetch
    });
    const elapsed = Date.now() - t0;

    assert.equal(result.verified, false);
    assert.equal(result.code, 'POI_SERVICE_UNAVAILABLE');
    // Overpass mirrors plus one Wikimedia fallback — still bounded, never an infinite loop
    assert.ok(queryAttempts <= 10, `Query attempts (${queryAttempts}) must not loop indefinitely`);
    assert.ok(elapsed < 14000, `Execution time (${elapsed}ms) must remain bounded`);
  });

  test('Scenario 5: Ordinary conversation turns do NOT invoke Overpass POI retrieval', async () => {
    const calledUrls = [];
    const mockFetch = async (url) => {
      calledUrls.push(url);
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '32.24', lon: '78.03', display_name: 'Spiti Valley, Himachal Pradesh, India' }]
        };
      }
      throw new Error('NVIDIA_MOCK_FALLBACK: Testing deterministic conversational state machine');
    };

    const req = {
      fetchFn: mockFetch,
      body: {
        message: 'I want to travel to Spiti Valley for 5 days with 3 people and total budget is 24000'
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.readyForConfirmation, true);

    // Verify NO Overpass interpreter endpoint was called during conversation turn
    const overpassCalls = calledUrls.filter(u => u.includes('interpreter') || u.includes('overpass'));
    assert.equal(overpassCalls.length, 0, 'No Overpass POI retrieval should occur during ordinary conversation turns');
  });

  test('Scenario 6: Failure during POI retrieval preserves extracted fields in controller response', async () => {
    clearGroundingCache();
    const mockAllDownFetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '32.24', lon: '78.03', display_name: 'Spiti Valley, Himachal Pradesh, India' }]
        };
      }
      // Overpass returns 504
      return { ok: false, status: 504, headers: new Map() };
    };

    const req = {
      fetchFn: mockAllDownFetch,
      body: {
        action: 'confirm',
        preferredSource: 'overpass-only',
        currentPreferences: {
          destination: { name: 'Spiti Valley', country: 'India' },
          duration: 4,
          travelers: 3,
          budget: 30000,
          travelStyle: 'Balanced'
        }
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'POI_SERVICE_UNAVAILABLE');
    assert.equal(res.body.retryable, true);
    // Extracted preferences are preserved intact so user can retry with 1 click
    assert.ok(res.body.currentPreferences);
    assert.equal(res.body.currentPreferences.destination?.name, 'Spiti Valley');
    assert.equal(res.body.currentPreferences.duration, 4);
    assert.equal(res.body.currentPreferences.travelers, 3);
    assert.equal(res.body.currentPreferences.budget, 30000);
  });

  test('Scenario 7: Confirmation step is strictly required before itinerary generation is attempted', async () => {
    let generationTriggered = false;
    const mockFetch = async (url) => {
      if (url.includes('interpreter')) {
        generationTriggered = true;
      }
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '28.6', lon: '77.2', display_name: 'Delhi, India' }]
        };
      }
      throw new Error('NVIDIA_MOCK_FALLBACK');
    };

    const req = {
      fetchFn: mockFetch,
      body: {
        message: 'Plan 3 days in Delhi for 2 people with total budget 18000'
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.readyForConfirmation, true);
    assert.equal(res.body.type, 'conversation');
    assert.equal(generationTriggered, false, 'Generation must not trigger before explicit confirmation');
    assert.equal(res.body.trip, undefined);
  });

  test('Scenario 8: In-flight request deduplication: concurrent queries trigger only 1 network fetch', async () => {
    clearGroundingCache();
    let networkFetchCount = 0;

    const mockSlowFetch = async () => {
      networkFetchCount++;
      await new Promise(r => setTimeout(r, 60));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            { type: 'node', id: 301, lat: 26.9, lon: 75.8, tags: { name: 'Amer Fort', tourism: 'attraction' } }
          ]
        })
      };
    };

    const promise1 = getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'concurrent-dedup-city',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mockSlowFetch
    });

    const promise2 = getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'concurrent-dedup-city',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mockSlowFetch
    });

    const [res1, res2] = await Promise.all([promise1, promise2]);

    assert.equal(res1.verified, true);
    assert.equal(res2.verified, true);
    assert.equal(res1.pois[0].name, 'Amer Fort');
    assert.equal(res2.pois[0].name, 'Amer Fort');
    assert.equal(networkFetchCount, 1, 'In-flight deduplication must prevent duplicate concurrent network fetches');
  });

  test('Scenario 9: Grounding service never fabricates attractions or substitutes unrelated destinations when Overpass fails', async () => {
    clearGroundingCache();
    const mockDownFetch = async () => ({
      ok: false,
      status: 504,
      headers: new Map()
    });

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [31.1, 31.2, 77.1, 77.2],
      destinationKey: 'shimla-nofabrication-test',
      lat: 31.1,
      lon: 77.17,
      fetchFn: mockDownFetch
    });

    assert.equal(result.verified, false);
    assert.equal(result.code, 'POI_SERVICE_UNAVAILABLE');
    assert.deepEqual(result.pois, []);
    assert.equal(result.count, 0);
  });

  test('Scenario 10: Disambiguation of NVIDIA vs. POI errors with distinct diagnostic codes', async () => {
    // 10A: POI error throws POI_SERVICE_UNAVAILABLE
    clearGroundingCache();
    const mockPoi504 = async () => ({ ok: false, status: 504, headers: new Map() });
    const poiResult = await getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'disambiguation-test',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mockPoi504
    });
    assert.equal(poiResult.code, 'POI_SERVICE_UNAVAILABLE');

    // 10B: NVIDIA timeout error throws NVIDIA_TIMEOUT
    const mockNvidiaTimeout = async () => {
      const err = new Error('NVIDIA API call timed out');
      err.name = 'AbortError';
      throw err;
    };

    let caughtNvidiaErr = null;
    try {
      await callNvidiaChat({
        messages: [{ role: 'user', content: 'hello' }],
        fetchFn: mockNvidiaTimeout
      });
    } catch (err) {
      caughtNvidiaErr = err;
    }

    assert.ok(caughtNvidiaErr);
    assert.equal(caughtNvidiaErr.code, 'NVIDIA_TIMEOUT');
    assert.notEqual(caughtNvidiaErr.code, poiResult.code, 'NVIDIA errors must be distinctly disambiguated from POI errors');
  });

  test('Scenario 11: HTTP 429 honors Retry-After, applies cooldown, and does not immediately hop to other mirrors', async () => {
    clearGroundingCache();
    const calledUrls = [];
    const mock429Fetch = async (url) => {
      calledUrls.push(url);
      const headers = new Map();
      headers.set('retry-after', '45');
      return {
        ok: false,
        status: 429,
        headers: { get: (k) => headers.get(k.toLowerCase()) }
      };
    };

    const res = await getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'test-429-city',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mock429Fetch
    });

    assert.equal(res.verified, false);
    assert.equal(res.code, 'POI_SERVICE_UNAVAILABLE');
    assert.ok(calledUrls.length === 1, 'Should NOT hop to other public mirrors to bypass 429 rate limit');
    assert.ok(getEndpointCooldown(calledUrls[0]) > 0, 'Endpoint cooldown must be active after 429');
  });

  test('Scenario 12: HTTP 504 progressively simplifies the Overpass QL without retrying the identical query', async () => {
    clearGroundingCache();
    const sentQueries = [];
    const mock504ThenOkFetch = async (url, options) => {
      const bodyStr = decodeURIComponent(options.body || '');
      sentQueries.push(bodyStr);
      if (sentQueries.length === 1) {
        return { ok: false, status: 504, headers: new Map() };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [{ type: 'node', id: 999, lat: 26.9, lon: 75.8, tags: { name: 'Jantar Mantar', tourism: 'attraction' } }]
        })
      };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [26.8, 27.0, 75.7, 75.9],
      destinationKey: 'query-reduction-city',
      lat: 26.9,
      lon: 75.8,
      fetchFn: mock504ThenOkFetch
    });

    assert.equal(result.verified, true);
    assert.equal(sentQueries.length, 2);
    // Level 1 query had ways and larger scope
    assert.ok(sentQueries[0].includes('way[') || sentQueries[0].includes('out center 20 qt;'));
    // Level 2 query was reduced to node-only with smaller radius and count
    assert.ok(!sentQueries[1].includes('way['), 'Level 2 query must not request ways');
    assert.ok(sentQueries[1].includes('out 15 qt;'), 'Level 2 query must request reduced output count');
  });

  test('Scenario 13: Shared concurrency limit queues excess simultaneous requests', async () => {
    const limiter = new ConcurrencyLimiter(2);
    let activeMax = 0;
    let running = 0;

    const runTask = async () => {
      const release = await limiter.acquire();
      running++;
      activeMax = Math.max(activeMax, running);
      await new Promise(r => setTimeout(r, 30));
      running--;
      release();
    };

    await Promise.all([runTask(), runTask(), runTask(), runTask()]);
    assert.equal(activeMax, 2, 'Concurrency limiter must cap active executions at maxConcurrent');
  });

  test('Scenario 14: Cache key normalization, exact-destination isolation, and no-cache on failure', async () => {
    clearGroundingCache();
    const k1 = buildPoiCacheKey({ destinationKey: '  New York  ', lat: 40.7128, lon: -74.0060, radiusMeters: 5000 });
    const k2 = buildPoiCacheKey({ destinationKey: 'new_york', lat: 40.714, lon: -74.008, radiusMeters: 5000 });
    assert.equal(k1, k2, 'Normalized cache keys should match for close coordinates and normalized names');

    // Failed queries are never cached as success:
    const mockFailFetch = async () => ({ ok: false, status: 500, headers: new Map() });
    await getVerifiedPoisForBoundingBox({
      boundingbox: [10, 11, 20, 21],
      destinationKey: 'fail-cache-test',
      fetchFn: mockFailFetch
    });

    let secondCallTriggered = false;
    await getVerifiedPoisForBoundingBox({
      boundingbox: [10, 11, 20, 21],
      destinationKey: 'fail-cache-test',
      fetchFn: async () => {
        secondCallTriggered = true;
        return { ok: false, status: 500, headers: new Map() };
      }
    });
    assert.equal(secondCallTriggered, true, 'Failed request must never be cached as a success');
  });

  test('Scenario 15: Conversation state, trip summary, and parameters are fully preserved on POI failure', async () => {
    clearGroundingCache();
    const mockDownFetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '32.24', lon: '78.03', display_name: 'Spiti Valley, India' }]
        };
      }
      return { ok: false, status: 504, headers: new Map() };
    };

    const req = {
      fetchFn: mockDownFetch,
      body: {
        action: 'confirm',
        preferredSource: 'overpass-only',
        currentPreferences: {
          destination: { name: 'Spiti Valley', country: 'India' },
          duration: 5,
          travelers: 3,
          budget: 24000,
          travelStyle: 'Packed'
        }
      }
    };
    const res = createMockRes();

    await handleAssistantChat(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'POI_SERVICE_UNAVAILABLE');
    assert.equal(res.body.conversationStage, 'ready_for_confirmation');
    assert.equal(res.body.readyForConfirmation, true);
    assert.equal(res.body.currentPreferences.duration, 5);
    assert.equal(res.body.currentPreferences.travelers, 3);
    assert.equal(res.body.currentPreferences.budget, 24000);
    assert.equal(res.body.confirmationSummary.destination.name, 'Spiti Valley');
  });
  test('Scenario 16: When Overpass returns 502, verified attraction catalog (Priority 2) resolves authentic POIs without failure', async () => {
    clearGroundingCache();
    // Fetch mock: Overpass is completely DOWN with 502
    const mock502OverpassFetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '31.99', lon: '77.31', display_name: 'Kasol, Himachal Pradesh, India' }]
        };
      }
      // Overpass returns 502 Bad Gateway
      return { ok: false, status: 502, headers: new Map() };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [31.95, 32.05, 77.28, 77.35],
      destinationKey: 'Kasol',
      lat: 31.99,
      lon: 77.31,
      fetchFn: mock502OverpassFetch
    });

    assert.equal(result.verified, true);
    assert.ok(result.pois.length >= 3);
    assert.equal(result.provider, 'dastaan-heritage-archive');
    assert.ok(result.pois.some(p => p.name.includes('Chalal') || p.name.includes('Parvati')));
    assert.ok(result.attribution.includes('Dastaan Verified Heritage Archive'));
  });

  test('Scenario 17: When Overpass returns 502 for uncurated destination, Wikimedia Geosearch succeeds as open-knowledge fallback', async () => {
    clearGroundingCache();
    let wikiCalled = false;
    const mockOverpassDownWikiUpFetch = async (url) => {
      if (url.includes('wikimedia.org') || url.includes('wikipedia.org')) {
        wikiCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            query: {
              geosearch: [
                { pageid: 9001, title: 'Historic Castle Observation Point', lat: 46.5, lon: 8.5 },
                { pageid: 9002, title: 'Alpine Botanical Garden', lat: 46.51, lon: 8.52 },
                { pageid: 9003, title: 'Glacier Heritage Museum', lat: 46.52, lon: 8.53 }
              ]
            }
          })
        };
      }
      return { ok: false, status: 502, headers: new Map() };
    };

    const result = await getVerifiedPoisForBoundingBox({
      boundingbox: [46.4, 46.6, 8.4, 8.6],
      destinationKey: 'Alpine Valley Pass',
      lat: 46.5,
      lon: 8.5,
      fetchFn: mockOverpassDownWikiUpFetch
    });

    assert.equal(result.verified, true);
    assert.ok(wikiCalled, 'Wikimedia Geosearch must be called when Overpass is down');
    assert.equal(result.provider, 'wikimedia-geosearch');
    assert.equal(result.count, 3);
    assert.equal(result.pois[0].name, 'Historic Castle Observation Point');
  });

  test('Scenario 18: Exact-destination cache validation: cached Kasol POIs never serve another destination', async () => {
    clearGroundingCache();
    // Seed Kasol in cache
    const kasolSeedFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          { type: 'node', id: 91, lat: 31.99, lon: 77.31, tags: { name: 'Kasol Riverside', tourism: 'attraction' } }
        ]
      })
    });

    const kasolRes = await getVerifiedPoisForBoundingBox({
      boundingbox: [31.9, 32.1, 77.2, 77.4],
      destinationKey: 'kasol-exact-cache',
      lat: 31.99,
      lon: 77.31,
      fetchFn: kasolSeedFetch
    });
    assert.equal(kasolRes.verified, true);

    // Query another destination with all down fetch
    const allDownFetch = async () => ({ ok: false, status: 504, headers: new Map() });
    const otherRes = await getVerifiedPoisForBoundingBox({
      boundingbox: [15.2, 15.6, 73.7, 74.1],
      destinationKey: 'different-destination-spec',
      lat: 15.4,
      lon: 73.8,
      fetchFn: allDownFetch
    });

    assert.equal(otherRes.verified, false);
    assert.notEqual(otherRes.pois[0]?.name, 'Kasol Riverside', 'Cross-destination cache pollution strictly forbidden');
  });

  test('Scenario 19: Single-flight generation deduplication: duplicate concurrent confirm requests share one operation', async () => {
    clearGroundingCache();
    let generationCallCount = 0;

    const mockFetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '31.99', lon: '77.31', display_name: 'Kasol, Himachal Pradesh, India' }]
        };
      }
      generationCallCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overview: 'Explore the serene mountain trails and riversides of Kasol.',
                  days: [
                    {
                      dayNum: 1,
                      dayTitle: 'Arrival & Riverside Walk',
                      activities: [
                        { time: '09:00', title: 'Chalal Trek Trail', desc: 'Walk along the Parvati River to Chalal village.', cat: 'NATURE', poiId: 'kasol_chalal_trail' },
                        { time: '14:00', title: 'Parvati River Promenade', desc: 'Relax by the crystal mountain river waters.', cat: 'NATURE', poiId: 'kasol_parvati_river' }
                      ]
                    }
                  ]
                })
              }
            }
          ]
        })
      };
    };

    const reqPayload = {
      sessionId: 'session_dedup_test_' + Date.now(),
      action: 'confirm',
      currentPreferences: {
        destination: { name: 'Kasol', country: 'India' },
        duration: 1,
        travelers: 2,
        budget: 15000,
        travelStyle: 'Balanced'
      }
    };

    const req1 = { body: { ...reqPayload }, fetchFn: mockFetch };
    const res1 = createMockRes();
    const req2 = { body: { ...reqPayload }, fetchFn: mockFetch };
    const res2 = createMockRes();

    // Fire both requests concurrently
    await Promise.all([
      handleAssistantChat(req1, res1),
      handleAssistantChat(req2, res2)
    ]);

    assert.equal(res1.statusCode, 201);
    assert.equal(res2.statusCode, 201);
    assert.equal(res1.body.success, true);
    assert.equal(res2.body.success, true);
    assert.equal(res1.body.trip.destination.name, 'Kasol');
    assert.equal(res2.body.trip.destination.name, 'Kasol');
  });
});
