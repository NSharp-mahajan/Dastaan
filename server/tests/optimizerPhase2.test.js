import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistanceKm,
  generateEstimatedRoute,
  calculateRoute,
  calculateDayRoute
} from '../src/services/routingService.js';
import {
  generateItinerary,
  generateItineraryWithLiveRouting,
  evaluateDayFeasibility,
  attachTransitToActivities,
  applyCrossDayShiftSuggestions
} from '../src/services/itineraryGenerator.js';
import { previewTrip, createTrip } from '../src/controllers/tripController.js';
import Trip from '../src/models/Trip.js';

function createMockReqRes(body = {}, user = null) {
  const req = { body, user, params: {} };
  const res = {
    statusCode: 200,
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
  return { req, res };
}

test('--- Phase 2: Real Routing Engine & Coordinate Handling ---', async (t) => {
  await t.test('calculates road/geodesic route for valid coordinates with source labels', async () => {
    const waypoints = [
      { name: 'Red Fort', latitude: 28.6562, longitude: 77.2410 },
      { name: 'India Gate', latitude: 28.6129, longitude: 77.2295 }
    ];

    const result = await calculateRoute(waypoints, 'driving');
    assert.equal(result.success, true);
    assert.ok(result.route);
    assert.ok(result.route.distanceKm > 0);
    assert.ok(result.route.durationMin > 0);
    assert.ok(['osrm', 'haversine-estimate'].includes(result.route.provider));
    assert.ok(result.route.sourceLabel, 'Must provide human-readable source label');
    assert.equal(result.route.legs.length, 1);
    assert.ok(result.route.legs[0].distanceKm > 0);
    assert.ok(result.route.legs[0].durationMin > 0);
    assert.ok(result.route.legs[0].sourceLabel);
  });

  await t.test('handles invalid, missing, or null coordinates honestly without fabricating values', async () => {
    const invalidWaypoints = [
      { name: 'Unmapped Stop 1', latitude: null, longitude: null },
      { name: 'Unmapped Stop 2', latitude: undefined, longitude: undefined }
    ];

    const route = await calculateDayRoute(invalidWaypoints, 'driving');
    assert.ok(route);
    assert.equal(route.distanceKm, 0);
    assert.equal(route.durationMin, 0);
    assert.equal(route.provider, 'insufficient-coordinates');
    assert.equal(route.isEstimated, false);
    assert.equal(route.sourceLabel, 'Travel Data Unavailable');
    assert.equal(route.legs.length, 0);
  });

  await t.test('generateEstimatedRoute honestly flags tortuosity factor and does not claim to be measured road route', () => {
    const waypoints = [
      { name: 'Kinkaku-ji', latitude: 35.0394, longitude: 135.7292 },
      { name: 'Fushimi Inari', latitude: 34.9671, longitude: 135.7727 }
    ];

    const estDriving = generateEstimatedRoute(waypoints, 'driving');
    assert.equal(estDriving.provider, 'haversine-estimate');
    assert.equal(estDriving.isEstimated, true);
    assert.match(estDriving.sourceLabel, /1\.35x Driving Tortuosity/i);
    assert.match(estDriving.note, /geodesic distance with urban road tortuosity/i);

    const estWalking = generateEstimatedRoute(waypoints, 'walking');
    assert.match(estWalking.sourceLabel, /1\.25x Walking Tortuosity/i);
  });
});

test('--- Phase 2: Travel-Aware Feasibility & No Double-Counting ---', async (t) => {
  await t.test('includes transit duration exactly once alongside visit duration', () => {
    const activities = [
      { title: 'Morning Landmark', visitDurationHours: 2.0, cat: 'CULTURE' },
      { title: 'Art Museum', visitDurationHours: 2.5, cat: 'ART' },
      { title: 'Evening Garden', visitDurationHours: 1.5, cat: 'NATURE' }
    ];
    // Total visits = 6.0 hours.
    // Transit = 45 min = ~0.8 hours.
    const route = {
      durationMin: 45,
      distanceKm: 8.5,
      provider: 'osrm',
      isEstimated: false,
      legs: [
        { from: 'Morning Landmark', to: 'Art Museum', distanceKm: 4.0, durationMin: 20 },
        { from: 'Art Museum', to: 'Evening Garden', distanceKm: 4.5, durationMin: 25 }
      ]
    };

    const feasibility = evaluateDayFeasibility(activities, route, 'Balanced'); // Budget: 8.0h
    assert.equal(feasibility.totalVisitHours, 6.0);
    assert.equal(feasibility.totalTransitHours, 0.8);
    assert.equal(feasibility.totalDayHours, 6.8); // 6.0 + 0.8 exactly once
    assert.equal(feasibility.isFeasible, true);
    assert.equal(feasibility.status, 'optimal');
    assert.equal(feasibility.routeQuality, 'road_network');
  });

  await t.test('flags overloaded schedules and identifies primary contributors', () => {
    const activities = [
      { title: 'Expansive Heritage Complex', visitDurationHours: 4.0, cat: 'CULTURE' },
      { title: 'National Art Gallery', visitDurationHours: 3.5, cat: 'ART' },
      { title: 'Historic Fortress', visitDurationHours: 3.0, cat: 'CULTURE' }
    ];
    // Total visits = 10.5 hours. Transit = 50 min (~0.8h). Total = 11.3h (Budget: 8.0h)
    const route = {
      durationMin: 50,
      distanceKm: 18.2,
      provider: 'osrm',
      isEstimated: false,
      legs: [
        { from: 'Expansive Heritage Complex', to: 'National Art Gallery', distanceKm: 12.0, durationMin: 32, isEstimated: false },
        { from: 'National Art Gallery', to: 'Historic Fortress', distanceKm: 6.2, durationMin: 18, isEstimated: false }
      ]
    };

    const feasibility = evaluateDayFeasibility(activities, route, 'Balanced', { dayNum: 1 });
    assert.equal(feasibility.isFeasible, false);
    assert.equal(feasibility.status, 'tight');
    assert.ok(feasibility.warnings.length >= 2);
    // Identifies primary activity contributor
    const hasActContributor = feasibility.warnings.some(w => w.includes('Expansive Heritage Complex'));
    assert.ok(hasActContributor, 'Must identify primary activity contributor');
    // Identifies major transit segment
    const hasTransitSegment = feasibility.warnings.some(w => w.includes('Major transit segment'));
    assert.ok(hasTransitSegment, 'Must identify major transit segment');
  });

  await t.test('suggests shifting an activity to a lighter day in multi-day itineraries', () => {
    const days = [
      {
        dayNum: 1,
        activities: [
          { title: 'Heavy Palace', visitDurationHours: 4.5, cat: 'CULTURE' },
          { title: 'Grand Museum', visitDurationHours: 3.5, cat: 'ART' },
          { title: 'Historic Fort', visitDurationHours: 2.5, cat: 'CULTURE' }
        ],
        route: { durationMin: 40, distanceKm: 12 },
        feasibility: { dailyBudgetHours: 8.0, totalDayHours: 11.2, isFeasible: false }
      },
      {
        dayNum: 2,
        activities: [
          { title: 'Morning Garden Walk', visitDurationHours: 2.0, cat: 'NATURE' },
          { title: 'Tea Ceremony', visitDurationHours: 1.5, cat: 'CULTURE' }
        ],
        route: { durationMin: 15, distanceKm: 3 },
        feasibility: { dailyBudgetHours: 8.0, totalDayHours: 3.8, isFeasible: true }
      }
    ];

    const balanced = applyCrossDayShiftSuggestions(days, 'Balanced');
    const day1Warnings = balanced[0].feasibility.warnings;
    const hasShiftSuggestion = day1Warnings.some(w => w.includes('Day 2'));
    assert.ok(hasShiftSuggestion, 'Must suggest shifting heavy activity to Day 2 with spare capacity');
  });
});

test('--- Phase 2: Consecutive Activity Transit Metadata (attachTransitToActivities) ---', () => {
  const activities = [
    { title: 'Stop A', latitude: 28.59, longitude: 77.25 },
    { title: 'Stop B', latitude: 28.61, longitude: 77.23 },
    { title: 'Stop C', latitude: 28.65, longitude: 77.24 }
  ];

  const route = {
    mode: 'driving',
    provider: 'osrm',
    legs: [
      { from: 'Stop A', to: 'Stop B', distanceKm: 3.2, durationMin: 12, isEstimated: false, sourceLabel: 'Road Network (OSRM)' },
      { from: 'Stop B', to: 'Stop C', distanceKm: 5.1, durationMin: 18, isEstimated: false, sourceLabel: 'Road Network (OSRM)' }
    ]
  };

  const enriched = attachTransitToActivities(activities, route);
  assert.equal(enriched.length, 3);
  assert.ok(enriched[0].transitToNext);
  assert.equal(enriched[0].transitToNext.toTitle, 'Stop B');
  assert.equal(enriched[0].transitToNext.distanceKm, 3.2);
  assert.equal(enriched[0].transitToNext.durationMin, 12);
  assert.equal(enriched[0].transitToNext.isEstimated, false);

  assert.ok(enriched[1].transitToNext);
  assert.equal(enriched[1].transitToNext.toTitle, 'Stop C');
  assert.equal(enriched[1].transitToNext.distanceKm, 5.1);

  // The last activity of the day must have null transitToNext
  assert.equal(enriched[2].transitToNext, null);
});

test('--- Phase 2: Parity between Guest Previews & Authenticated Trips ---', async (t) => {
  await t.test('guest previewTrip enriches itinerary with live routing, legs, and transit metadata', async () => {
    const { req, res } = createMockReqRes({
      destination: { id: 'new-delhi', name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 },
      duration: 2,
      budget: 10000,
      travelStyle: 'Balanced',
      interests: ['Culture', 'History']
    });

    await previewTrip(req, res, (err) => { throw err; });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    const itin = res.body.data.itinerary;
    assert.ok(itin);
    assert.equal(itin.days.length, 2);

    itin.days.forEach(day => {
      assert.ok(day.route, 'Day must include route object');
      assert.ok(typeof day.route.distanceKm === 'number');
      assert.ok(typeof day.route.durationMin === 'number');
      assert.ok(day.feasibility, 'Day must include feasibility object');
      assert.ok(day.feasibility.routeQuality, 'Feasibility must identify route quality');

      // Check first activity has transit metadata if multiple activities exist
      if (day.activities.length > 1) {
        assert.ok(day.activities[0].transitToNext, 'First activity must have transitToNext');
        assert.equal(day.activities[day.activities.length - 1].transitToNext, null, 'Last activity must have null transit');
      }
    });
  });

  await t.test('Trip Mongoose Schema persists routeQuality, suggestions, and transitToNext cleanly', () => {
    const tripInstance = new Trip({
      user: '60d0fe4f5311236168a109ca',
      destination: { id: 'kyoto', name: 'Kyoto' },
      duration: 1,
      budget: 9000,
      travelStyle: 'Balanced',
      itinerary: {
        days: [
          {
            dayNum: 1,
            dayTitle: 'KYOTO SHRINES',
            feasibility: {
              dailyBudgetHours: 8.0,
              totalVisitHours: 5.5,
              totalTransitHours: 1.0,
              totalDayHours: 6.5,
              status: 'optimal',
              isFeasible: true,
              routeQuality: 'road_network',
              suggestions: ['Comfortable pace maintained.'],
              warnings: []
            },
            route: {
              distanceKm: 6.4,
              durationMin: 22,
              mode: 'driving',
              provider: 'osrm',
              isEstimated: false,
              legs: [
                { from: 'Kinkaku-ji', to: 'Ryoan-ji', distanceKm: 1.8, durationMin: 6, isEstimated: false, sourceLabel: 'Road Network (OSRM)' }
              ]
            },
            activities: [
              {
                time: '09:30',
                title: 'Kinkaku-ji',
                latitude: 35.0394,
                longitude: 135.7292,
                visitDurationHours: 2.0,
                transitToNext: {
                  toTitle: 'Ryoan-ji',
                  distanceKm: 1.8,
                  durationMin: 6,
                  mode: 'driving',
                  provider: 'osrm',
                  isEstimated: false,
                  sourceLabel: 'Road Network (OSRM)'
                }
              },
              {
                time: '12:00',
                title: 'Ryoan-ji',
                latitude: 35.0345,
                longitude: 135.7182,
                visitDurationHours: 1.5,
                transitToNext: null
              }
            ]
          }
        ]
      }
    });

    const validationError = tripInstance.validateSync();
    assert.equal(validationError, undefined, 'Trip schema with Phase 2 fields must validate cleanly');
    assert.equal(tripInstance.itinerary.days[0].feasibility.routeQuality, 'road_network');
    assert.equal(tripInstance.itinerary.days[0].activities[0].transitToNext.distanceKm, 1.8);
  });
});
