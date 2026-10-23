import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  generateItinerary,
  generateItineraryWithLiveRouting,
  recalculateItinerary
} from '../src/services/itineraryGenerator.js';
import { recalculateTripItinerary, updateTrip, createTrip, getTripById } from '../src/controllers/tripController.js';
import Trip from '../src/models/Trip.js';

function createMockReqRes(body = {}, user = null, params = {}) {
  const req = { body, user, params };
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

test('--- Phase 3: Interactive Itinerary Editing & Recalculation Engine ---', async (t) => {
  await t.test('moving activities up/down recalculates route sequence, times, and transit legs without stale values', async () => {
    // Start with a 1-day itinerary with 3 places
    const initialItin = generateItinerary({
      destination: { id: 'new-delhi', name: 'New Delhi' },
      duration: 1,
      travelStyle: 'Balanced'
    });

    const day1 = initialItin.days[0];
    assert.equal(day1.activities.length, 3);
    const origFirstTitle = day1.activities[0].title;
    const origSecondTitle = day1.activities[1].title;

    // Simulate Move Down: swap act[0] and act[1]
    const editedDays = [
      {
        ...day1,
        activities: [day1.activities[1], day1.activities[0], day1.activities[2]]
      }
    ];

    const recalculated = await recalculateItinerary({
      destination: { id: 'new-delhi', name: 'New Delhi' },
      travelStyle: 'Balanced',
      itinerary: { ...initialItin, days: editedDays }
    });

    const recDay1 = recalculated.days[0];
    assert.equal(recDay1.activities[0].title, origSecondTitle, 'Second place must now be first');
    assert.equal(recDay1.activities[1].title, origFirstTitle, 'First place must now be second');

    // Verify chronological times were re-assigned
    assert.equal(recDay1.activities[0].time, '09:30');
    assert.equal(recDay1.activities[1].time, '13:00');
    assert.equal(recDay1.activities[2].time, '16:30');

    // Verify fresh transit metadata reflects new order
    assert.ok(recDay1.activities[0].transitToNext);
    assert.equal(recDay1.activities[0].transitToNext.toTitle, origFirstTitle);
    assert.equal(recDay1.activities[2].transitToNext, null, 'Last activity must have null transitToNext');
  });

  await t.test('removing an activity updates day feasibility and recalculates routing', async () => {
    const initialItin = generateItinerary({
      destination: { id: 'jaipur', name: 'Jaipur' },
      duration: 1,
      travelStyle: 'Packed' // Starts with 4 stops
    });

    const day1 = initialItin.days[0];
    const origCount = day1.activities.length;
    const origHours = day1.feasibility.totalDayHours;

    // Remove 1 activity
    const editedDays = [
      {
        ...day1,
        activities: day1.activities.slice(0, origCount - 1)
      }
    ];

    const recalculated = await recalculateItinerary({
      destination: { id: 'jaipur', name: 'Jaipur' },
      travelStyle: 'Packed',
      itinerary: { ...initialItin, days: editedDays }
    });

    const recDay = recalculated.days[0];
    assert.equal(recDay.activities.length, origCount - 1);
    assert.ok(recDay.feasibility.totalDayHours < origHours, 'Total hours must decrease after removing activity');
    assert.equal(recDay.feasibility.isFeasible, true);
  });

  await t.test('handles empty-day state gracefully when all activities are removed', async () => {
    const initialItin = generateItinerary({
      destination: { id: 'kyoto', name: 'Kyoto' },
      duration: 2,
      travelStyle: 'Balanced'
    });

    // Remove all activities from Day 1
    const editedDays = [
      { ...initialItin.days[0], activities: [] },
      { ...initialItin.days[1] }
    ];

    const recalculated = await recalculateItinerary({
      destination: { id: 'kyoto', name: 'Kyoto' },
      travelStyle: 'Balanced',
      itinerary: { ...initialItin, days: editedDays }
    });

    const emptyDay = recalculated.days[0];
    assert.equal(emptyDay.activities.length, 0);
    assert.equal(emptyDay.route.distanceKm, 0);
    assert.equal(emptyDay.route.durationMin, 0);
    assert.equal(emptyDay.feasibility.totalDayHours, 0);
    assert.equal(emptyDay.feasibility.isFeasible, true);
    assert.match(emptyDay.feasibility.warnings[0], /No activities scheduled/i);

    // Day 2 remains intact
    assert.ok(recalculated.days[1].activities.length > 0);
  });

  await t.test('moving an activity between days recalculates both days independently', async () => {
    const initialItin = generateItinerary({
      destination: { id: 'florence', name: 'Florence' },
      duration: 2,
      travelStyle: 'Balanced'
    });

    const day1 = initialItin.days[0];
    const day2 = initialItin.days[1];

    // Transfer first activity from Day 1 to Day 2
    const movedActivity = day1.activities[0];
    const editedDays = [
      {
        ...day1,
        activities: day1.activities.slice(1)
      },
      {
        ...day2,
        activities: [...day2.activities, movedActivity]
      }
    ];

    const recalculated = await recalculateItinerary({
      destination: { id: 'florence', name: 'Florence' },
      travelStyle: 'Balanced',
      itinerary: { ...initialItin, days: editedDays }
    });

    assert.equal(recalculated.days[0].activities.length, day1.activities.length - 1);
    assert.equal(recalculated.days[1].activities.length, day2.activities.length + 1);

    // Target day now includes the transferred activity at the end
    const lastAct = recalculated.days[1].activities[recalculated.days[1].activities.length - 1];
    assert.equal(lastAct.title, movedActivity.title);
  });

  await t.test('replacing an activity updates route distance, duration, and transit links', async () => {
    const initialItin = generateItinerary({
      destination: { id: 'new-delhi', name: 'New Delhi' },
      duration: 1,
      travelStyle: 'Balanced'
    });

    const day1 = initialItin.days[0];
    const replacementPlace = {
      title: 'National Crafts Museum & Hastkala Academy',
      desc: 'Located at Pragati Maidan. Realistic visit: ~2.5h.',
      cat: 'CULTURE',
      placeId: 'delhi-crafts-museum',
      latitude: 28.6145,
      longitude: 77.2422,
      visitDurationHours: 2.5
    };

    const editedDays = [
      {
        ...day1,
        activities: [replacementPlace, day1.activities[1], day1.activities[2]]
      }
    ];

    const recalculated = await recalculateItinerary({
      destination: { id: 'new-delhi', name: 'New Delhi' },
      travelStyle: 'Balanced',
      itinerary: { ...initialItin, days: editedDays }
    });

    assert.equal(recalculated.days[0].activities[0].title, replacementPlace.title);
    assert.equal(recalculated.days[0].activities[0].transitToNext.toTitle, day1.activities[1].title);
  });
});

test('--- Phase 3: Recalculate Public API Endpoint ---', async (t) => {
  await t.test('POST /api/trips/recalculate returns fresh route and feasibility for guest edits', async () => {
    const initialItin = generateItinerary({
      destination: { id: 'manali', name: 'Manali' },
      duration: 1,
      travelStyle: 'Relaxed'
    });

    const { req, res } = createMockReqRes({
      destination: { id: 'manali', name: 'Manali' },
      travelStyle: 'Relaxed',
      itinerary: initialItin
    });

    await recalculateTripItinerary(req, res, (err) => { throw err; });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.days);
    assert.equal(res.body.data.days.length, 1);
  });

  await t.test('POST /api/trips/recalculate rejects invalid or missing itinerary with 400', async () => {
    const { req, res } = createMockReqRes({
      destination: { name: 'Manali' },
      itinerary: null
    });

    await recalculateTripItinerary(req, res, (err) => { throw err; });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /valid itinerary.*required/i);
  });
});

test('--- Phase 3: Security & Database Persistence ---', async (t) => {
  await t.test('PUT /api/trips/:id blocks unauthenticated guest or unauthorized users with 403 Access Denied', async () => {
    const userA_Id = '507f1f77bcf86cd799439011';
    const mockTripId = '654321098765432109876543';

    const origFind = Trip.findById;
    Trip.findById = async (id) => ({
      _id: id,
      user: userA_Id,
      destination: { id: 'delhi', name: 'Delhi' },
      duration: 2,
      budget: 8000,
      travelStyle: 'Balanced',
      itinerary: { days: [] },
      save: async () => {}
    });

    try {
      // Unauthenticated request (no req.user)
      const { req, res } = createMockReqRes({
        itinerary: { days: [] }
      }, null, { id: mockTripId });

      await updateTrip(req, res, () => {});
      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /access denied/i);
    } finally {
      Trip.findById = origFind;
    }
  });

  await t.test('PUT /api/trips/:id allows trip owner to persist edited itinerary and recalculates routing', async () => {
    const ownerId = '507f1f77bcf86cd799439011';
    const tripId = '654321098765432109876543';

    let savedData = null;
    const origFind = Trip.findById;
    Trip.findById = async (id) => ({
      _id: id,
      user: ownerId,
      destination: { id: 'manali', name: 'Manali' },
      duration: 1,
      budget: 9000,
      travelStyle: 'Relaxed',
      itinerary: { days: [] },
      save: async function() {
        savedData = this;
      }
    });

    try {
      const editedDays = [
        {
          dayNum: 1,
          dayTitle: 'EDITED DAY',
          activities: [
            { title: 'Solang Valley', latitude: 32.3166, longitude: 77.1578, visitDurationHours: 2.5 },
            { title: 'Hadimba Temple', latitude: 32.2483, longitude: 77.1805, visitDurationHours: 1.5 }
          ]
        }
      ];

      const { req, res } = createMockReqRes({
        itinerary: { days: editedDays }
      }, { _id: ownerId }, { id: tripId });

      await updateTrip(req, res, () => {});
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.ok(savedData);
      assert.equal(savedData.itinerary.days[0].activities[0].title, 'Solang Valley');
      assert.ok(savedData.itinerary.days[0].activities[0].transitToNext);
      assert.equal(savedData.itinerary.days[0].activities[0].transitToNext.toTitle, 'Hadimba Temple');
    } finally {
      Trip.findById = origFind;
    }
  });

  await t.test('Trip Mongoose Schema persists edited activity order and transit metadata cleanly', () => {
    const tripInstance = new Trip({
      user: '60d0fe4f5311236168a109ca',
      destination: { id: 'kyoto', name: 'Kyoto' },
      duration: 2,
      budget: 15000,
      travelStyle: 'Balanced',
      itinerary: {
        tagline: 'Custom edited journey',
        days: [
          {
            dayNum: 1,
            dayTitle: 'MODIFIED DAY 1',
            feasibility: {
              dailyBudgetHours: 8.0,
              totalVisitHours: 4.0,
              totalTransitHours: 0.6,
              totalDayHours: 4.6,
              status: 'optimal',
              isFeasible: true,
              routeQuality: 'road_network',
              suggestions: [],
              warnings: []
            },
            route: {
              distanceKm: 4.5,
              durationMin: 18,
              mode: 'driving',
              provider: 'osrm',
              isEstimated: false,
              legs: [
                { from: 'Custom Stop A', to: 'Custom Stop B', distanceKm: 4.5, durationMin: 18, isEstimated: false }
              ]
            },
            activities: [
              {
                time: '10:00',
                title: 'Custom Stop A',
                latitude: 35.01,
                longitude: 135.75,
                visitDurationHours: 2.0,
                transitToNext: {
                  toTitle: 'Custom Stop B',
                  distanceKm: 4.5,
                  durationMin: 18,
                  mode: 'driving',
                  provider: 'osrm',
                  isEstimated: false,
                  sourceLabel: 'Road Network (OSRM)'
                }
              },
              {
                time: '13:30',
                title: 'Custom Stop B',
                latitude: 35.03,
                longitude: 135.77,
                visitDurationHours: 2.0,
                transitToNext: null
              }
            ]
          },
          {
            dayNum: 2,
            dayTitle: 'EMPTY EXPLORATION DAY',
            activities: []
          }
        ]
      }
    });

    const valErr = tripInstance.validateSync();
    assert.equal(valErr, undefined, 'Trip with custom edited order and empty day must validate without error');
    assert.equal(tripInstance.itinerary.days[0].dayTitle, 'MODIFIED DAY 1');
    assert.equal(tripInstance.itinerary.days[0].activities[0].title, 'Custom Stop A');
    assert.equal(tripInstance.itinerary.days[0].activities[0].transitToNext.toTitle, 'Custom Stop B');
    assert.equal(tripInstance.itinerary.days[1].activities.length, 0);
  });
});
