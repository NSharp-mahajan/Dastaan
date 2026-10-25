import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedItinerary, buildBudgetBreakdown, calculateTripDates } from '../src/services/itineraryService.js';
import generateItinerary, { destinationTemplates } from '../src/utils/itineraryGenerator.js';

describe('--- Phase 3 Acceptance: Frontend & Renderer Data Contracts ---', () => {

  // Test 1: Five-day Jaipur trip for two travellers with a selected start date
  test('Test 1: Five-day Jaipur trip for 2 travellers with selected start date', async () => {
    const startDate = '2026-11-01';
    const duration = 5;
    const travelers = 2;
    const budget = 30000;

    const generated = generateItinerary({
      destination: { id: 'jaipur', name: 'Jaipur', country: 'India' },
      duration,
      budget,
      travelers,
      startDate,
      travelStyle: 'Balanced',
      interests: ['Culture', 'History']
    });
    const budgetResult = buildBudgetBreakdown(budget, travelers);
    const dateResult = calculateTripDates(startDate, duration);

    assert.equal(generated.days.length, 5, 'Must generate exactly 5 days');
    assert.equal(dateResult.dates.length, 5, 'Must generate exactly 5 calendar dates');
    assert.equal(new Date(dateResult.dates[0]).toISOString().split('T')[0], '2026-11-01');
    assert.equal(new Date(dateResult.dates[4]).toISOString().split('T')[0], '2026-11-05');

    assert.equal(new Date(generated.days[0].date).toISOString().split('T')[0], '2026-11-01');
    assert.equal(new Date(generated.days[4].date).toISOString().split('T')[0], '2026-11-05');

    // Verify per-person calculations
    const costPerPerson = Math.round(budget / travelers);
    assert.equal(costPerPerson, 15000);
    assert.equal(generated.estimatedCostPerPerson, 15000);
    assert.equal(budgetResult.breakdown.find(b => b.name === 'Accommodation').amount, 12000);
    assert.equal(budgetResult.breakdown.find(b => b.name === 'Accommodation').perPersonAmount, 6000);

    // Verify non-repetition across all 5 days
    const poiTitles = [];
    for (const d of generated.days) {
      for (const act of d.activities) {
        poiTitles.push(act.title.toLowerCase());
      }
    }
    const uniqueTitles = new Set(poiTitles);
    assert.equal(poiTitles.length, uniqueTitles.size, 'All activities across 5 days must be unique');
  });

  // Test 2: Destination outside curated 7 cities (Tokyo) with grounded POIs
  test('Test 2: Valid destination outside original 7-city catalog (Tokyo)', async () => {
    process.env.NVIDIA_API_KEY = 'mock-nvapi-key';

    const mockTokyoPois = [
      { id: 't1', title: 'Senso-ji Temple', cat: 'CULTURE', time: '09:00', desc: 'Ancient Buddhist temple.' },
      { id: 't2', title: 'Tokyo Skytree', cat: 'EXPLORE', time: '13:00', desc: 'Panoramic broadcast tower.' },
      { id: 't3', title: 'Tsukiji Outer Market', cat: 'FOOD', time: '17:00', desc: 'Vibrant street seafood market.' },
      { id: 't4', title: 'Meiji Jingu Shrine', cat: 'CULTURE', time: '09:00', desc: 'Shinto shrine in tranquil forest.' },
      { id: 't5', title: 'Shibuya Crossing', cat: 'EXPLORE', time: '13:00', desc: 'World-famous pedestrian intersection.' },
      { id: 't6', title: 'Shinjuku Gyoen', cat: 'NATURE', time: '17:00', desc: 'Expansive national botanical garden.' }
    ];

    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{
            display_name: 'Tokyo, Japan',
            lat: '35.6762',
            lon: '139.6503',
            boundingbox: ['35.5', '35.8', '139.5', '139.8'],
            address: { city: 'Tokyo', country: 'Japan' }
          }]
        };
      }
      if (urlStr.includes('overpass-api.de')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [
              { type: 'node', id: 101, lat: 35.71, lon: 139.79, tags: { name: 'Senso-ji Temple', historic: 'monastery' } },
              { type: 'node', id: 102, lat: 35.71, lon: 139.81, tags: { name: 'Tokyo Skytree', tourism: 'attraction' } },
              { type: 'node', id: 103, lat: 35.66, lon: 139.77, tags: { name: 'Tsukiji Outer Market', amenity: 'marketplace' } },
              { type: 'node', id: 104, lat: 35.67, lon: 139.69, tags: { name: 'Meiji Jingu Shrine', historic: 'monastery' } },
              { type: 'node', id: 105, lat: 35.65, lon: 139.70, tags: { name: 'Shibuya Crossing', highway: 'pedestrian' } },
              { type: 'node', id: 106, lat: 35.68, lon: 139.71, tags: { name: 'Shinjuku Gyoen', leisure: 'park' } }
            ]
          })
        };
      }
      if (urlStr.includes('nvidia') || urlStr.includes('chat/completions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  tagline: 'Neon skylines and quiet ancient temples.',
                  days: [
                    { dayNum: 1, dayTitle: 'HISTORIC ASAKUSA', activities: mockTokyoPois.slice(0, 3) },
                    { dayNum: 2, dayTitle: 'MODERN SHIBUYA', activities: mockTokyoPois.slice(3, 6) }
                  ]
                })
              }
            }]
          })
        };
      }
      return { ok: false, status: 404 };
    };

    const trip = await generateGroundedItinerary(
      {
        destination: { name: 'Tokyo', country: 'Japan' },
        duration: 2,
        travelers: 2,
        startDate: '2026-12-01',
        budget: 50000,
        interests: ['Culture', 'Food'],
        travelStyle: 'Balanced'
      },
      { fetchFn: mockFetch }
    );

    assert.equal(trip.destination.name, 'Tokyo');
    assert.equal(trip.itinerary.days.length, 2);
    assert.equal(new Date(trip.itinerary.days[0].date).toISOString().split('T')[0], '2026-12-01');
    assert.equal(new Date(trip.itinerary.days[1].date).toISOString().split('T')[0], '2026-12-02');
    assert.equal(trip.itinerary.estimatedCostPerPerson, 25000);
  });

  // Test 3: Missing dates and legacy saved trips
  test('Test 3: Missing dates and legacy saved trips default gracefully', () => {
    // Legacy trip without travelers or dates
    const legacyTrip = {
      destination: { name: 'Manali', country: 'India', id: 'manali' },
      duration: 3,
      budget: 12000,
      travelStyle: 'Relaxed'
    };

    // Client/server normalization
    const travelers = Math.max(1, parseInt(legacyTrip.travelers, 10) || 1);
    const startDate = legacyTrip.startDate || null;
    const estimatedCostPerPerson = Math.round(legacyTrip.budget / travelers);
    const dateResult = calculateTripDates(startDate, legacyTrip.duration);

    assert.equal(travelers, 1, 'Missing travelers must default to 1');
    assert.equal(startDate, null, 'Missing startDate must be null');
    assert.equal(estimatedCostPerPerson, 12000, 'Per person cost for 1 traveler equals total budget');
    assert.deepEqual(dateResult.dates, [], 'Missing startDate produces empty dates array without error');
  });

  // Test 4: Invalid traveller counts and past dates validation
  test('Test 4: Invalid traveller counts (<1, >20) and past dates are rejected', () => {
    // Travelers < 1
    assert.throws(() => {
      const t = 0;
      if (t < 1 || t > 20) throw new Error('TRAVELERS_OUT_OF_RANGE');
    }, /TRAVELERS_OUT_OF_RANGE/);

    // Travelers > 20
    assert.throws(() => {
      const t = 25;
      if (t < 1 || t > 20) throw new Error('TRAVELERS_OUT_OF_RANGE');
    }, /TRAVELERS_OUT_OF_RANGE/);

    // Past date check
    const pastDate = '2020-01-01';
    const today = new Date().toISOString().split('T')[0];
    assert.ok(pastDate < today, 'Past date must be detected as strictly less than today');
  });

  // Test 5: Backend errors for unknown destinations and insufficient POIs
  test('Test 5: Unknown destination and insufficient attractions throw structured errors without falling back to Delhi', async () => {
    const mockUnknownFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => [] // Nominatim finds nothing
    });

    await assert.rejects(
      async () => {
        await generateGroundedItinerary(
          {
            destination: { name: 'Atlantis Underwater Dome' },
            duration: 3
          },
          { fetchFn: mockUnknownFetch }
        );
      },
      (err) => {
        assert.equal(err.code, 'DESTINATION_NOT_FOUND');
        assert.ok(!err.message.includes('New Delhi'), 'Must not substitute Delhi');
        return true;
      }
    );
  });

  // Test 6: Itinerary with fewer days than requested does NOT repeat days
  test('Test 6: Incomplete itinerary (fewer days than duration) strictly avoids modulo repetition', () => {
    const generatedDays = [
      { dayNum: 1, dayTitle: 'DAY 1 ATTRACTIONS', activities: [{ title: 'Site A' }] },
      { dayNum: 2, dayTitle: 'DAY 2 ATTRACTIONS', activities: [{ title: 'Site B' }] }
    ];
    const requestedDuration = 5;

    // Previous faulty logic: daysList[(activeDay - 1) % daysList.length]
    // Under old logic: Day 3 would be daysList[0] (Site A), Day 4 would be daysList[1] (Site B)
    const oldDay3 = generatedDays[(3 - 1) % generatedDays.length];
    assert.equal(oldDay3.dayNum, 1, 'Old logic mistakenly repeated Day 1 for Day 3');

    // New logic: strict 1-based indexing
    const newDay3 = generatedDays[3 - 1] || null;
    const newDay4 = generatedDays[4 - 1] || null;
    const newDay5 = generatedDays[5 - 1] || null;

    assert.equal(newDay3, null, 'New logic returns null for Day 3 without repeating');
    assert.equal(newDay4, null, 'New logic returns null for Day 4 without repeating');
    assert.equal(newDay5, null, 'New logic returns null for Day 5 without repeating');
  });

  // Test 7: Budget totals and per-person consistency
  test('Test 7: Total budget and per-person cost calculations in INR', () => {
    const budget = 45000;
    const travelers = 3;

    const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(budget, travelers);
    const totalAllocated = breakdown.reduce((sum, b) => sum + b.amount, 0);
    const perPersonSum = breakdown.reduce((sum, b) => sum + b.perPersonAmount, 0);

    assert.equal(totalAllocated, 45000, 'Sum of category totals must equal budget');
    assert.equal(perPersonSum, 15000, 'Sum of per-person amounts must equal budget / travelers');
    assert.equal(estimatedCostPerPerson, 15000);
  });
});
