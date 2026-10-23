import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateItinerary,
  scorePlaceForInterests,
  optimizeActivityOrder2Opt,
  evaluateDayFeasibility
} from '../src/services/itineraryGenerator.js';
import { previewTrip } from '../src/controllers/tripController.js';

// Helper to construct mock Express request and response objects
function createMockReqRes(body = {}) {
  const req = { body, user: null };
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

test('--- Phase 1: Public Preview Endpoint (Guest Generation) ---', async (t) => {
  await t.test('previewTrip generates complete itinerary preview without requiring authentication', async () => {
    const { req, res } = createMockReqRes({
      destination: { id: 'new-delhi', name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 },
      duration: 3,
      budget: 12000,
      travelStyle: 'Balanced',
      interests: ['History', 'Culture']
    });

    await previewTrip(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.equal(res.body.data.isGuestPreview, true);
    assert.equal(res.body.data.duration, 3);
    assert.ok(Array.isArray(res.body.data.itinerary?.days));
    assert.equal(res.body.data.itinerary.days.length, 3);
  });

  await t.test('previewTrip rejects missing or invalid destination with 400', async () => {
    const { req, res } = createMockReqRes({
      destination: null,
      duration: 3,
      budget: 10000
    });

    await previewTrip(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /destination.*required/i);
  });

  await t.test('previewTrip rejects invalid duration (< 1 or > 60) with 400', async () => {
    const { req, res } = createMockReqRes({
      destination: { name: 'Jaipur' },
      duration: 0,
      budget: 10000
    });

    await previewTrip(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /duration.*between 1 and 60/i);
  });

  await t.test('previewTrip rejects budget below minimum ₹1,000 with 400', async () => {
    const { req, res } = createMockReqRes({
      destination: { name: 'Jaipur' },
      duration: 3,
      budget: 500
    });

    await previewTrip(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /budget.*at least ₹1,000/i);
  });
});

test('--- Phase 1: Interest-Based Personalization & Scoring ---', async (t) => {
  await t.test('scorePlaceForInterests gives significant score boost to places matching chosen interests', () => {
    const artGallery = {
      name: 'Lodhi Art District Open Gallery',
      category: 'attraction',
      address: 'Lodhi Colony, New Delhi',
      rating: 4.6
    };

    const regularScore = scorePlaceForInterests(artGallery, []);
    const boostedScore = scorePlaceForInterests(artGallery, ['Art']);

    assert.equal(regularScore, 4.6);
    assert.equal(boostedScore, 8.6); // 4.6 + 4.0 boost
  });

  await t.test('selecting specific interests directly influences scheduled places', () => {
    // Generate Delhi with 'Art' vs Delhi with 'Nature'
    const artTrip = generateItinerary({
      destination: { id: 'new-delhi', name: 'New Delhi' },
      duration: 1,
      interests: ['Art'],
      travelStyle: 'Relaxed'
    });

    const day1Titles = artTrip.days[0].activities.map(a => a.title);
    // Lodhi Art District should be prioritized in Day 1 when 'Art' is selected
    const hasArt = day1Titles.some(t => t.toLowerCase().includes('art') || t.toLowerCase().includes('lodhi'));
    assert.ok(hasArt, `Selecting Art must schedule art venues on Day 1, got: ${day1Titles.join(', ')}`);
  });
});

test('--- Phase 1: 2-Opt Route Optimization (Intra-Day Ordering) ---', async (t) => {
  await t.test('optimizeActivityOrder2Opt reduces backtracking in crossed waypoint paths', () => {
    // 4 stops placed in a criss-cross pattern that backtracking order would traverse inefficiently
    // A: (0, 0), B: (2, 2), C: (0, 2), D: (2, 0)
    // Suboptimal path A -> B -> C -> D has distance: dist(A,B) + dist(B,C) + dist(C,D)
    // Optimal path A -> C -> B -> D or A -> D -> B -> C untangles the crossing
    const unoptimized = [
      { title: 'A', latitude: 28.50, longitude: 77.10 },
      { title: 'B', latitude: 28.70, longitude: 77.30 },
      { title: 'C', latitude: 28.70, longitude: 77.10 },
      { title: 'D', latitude: 28.50, longitude: 77.30 }
    ];

    const optimized = optimizeActivityOrder2Opt(unoptimized);
    assert.equal(optimized.length, 4);

    // Helper to calculate total distance
    const calcDist = (list) => {
      let d = 0;
      for (let i = 0; i < list.length - 1; i++) {
        const dLat = (list[i+1].latitude - list[i].latitude);
        const dLng = (list[i+1].longitude - list[i].longitude);
        d += Math.sqrt(dLat*dLat + dLng*dLng);
      }
      return d;
    };

    assert.ok(
      calcDist(optimized) <= calcDist(unoptimized),
      '2-opt optimization must produce a route with less or equal travel distance'
    );
  });
});

test('--- Phase 1: Daily Feasibility & Time Budgeting ---', async (t) => {
  await t.test('calculates daily feasibility metrics accurately and flags overloaded schedules', () => {
    const activities = [
      { title: 'Major Museum', visitDurationHours: 3.5, cat: 'CULTURE' },
      { title: 'Historic Palace', visitDurationHours: 3.0, cat: 'CULTURE' },
      { title: 'Culinary Tasting', visitDurationHours: 2.0, cat: 'FOOD' }
    ];
    // Total visit: 8.5 hours. Transit: 60 min (1.0 hr). Total day: 9.5 hours.
    const route = { durationMin: 60 };
    const feasibility = evaluateDayFeasibility(activities, route, 'Relaxed'); // Budget is 6.0h for Relaxed

    assert.equal(feasibility.dailyBudgetHours, 6.0);
    assert.equal(feasibility.totalVisitHours, 8.5);
    assert.equal(feasibility.totalTransitHours, 1.0);
    assert.equal(feasibility.totalDayHours, 9.5);
    assert.equal(feasibility.status, 'tight');
    assert.equal(feasibility.isFeasible, false);
    assert.ok(feasibility.warnings.length > 0);
    assert.match(feasibility.warnings[0], /Schedule is tight/i);
  });

  await t.test('marks comfortable days as optimal pace without warnings', () => {
    const activities = [
      { title: 'Morning Landmark', visitDurationHours: 2.0, cat: 'CULTURE' },
      { title: 'Afternoon Garden', visitDurationHours: 1.5, cat: 'NATURE' }
    ];
    // Total visit: 3.5 hours. Transit: 20 min (0.3h). Total: 3.8 hours. Budget: 8.0h
    const route = { durationMin: 20 };
    const feasibility = evaluateDayFeasibility(activities, route, 'Balanced');

    assert.ok(['optimal', 'relaxed'].includes(feasibility.status));
    assert.equal(feasibility.isFeasible, true);
    assert.equal(feasibility.warnings.length, 0);
  });
});

test('--- Phase 1: Honest Data Integrity (No Synthetic Coordinates) ---', async (t) => {
  await t.test('extended days beyond curated catalog have null coordinates rather than synthetic offsets', () => {
    const itin = generateItinerary({
      destination: { id: 'mostar', name: 'Mostar' },
      duration: 6,
      travelStyle: 'Balanced'
    });

    assert.equal(itin.days.length, 6);
    const day5 = itin.days[4];
    const day6 = itin.days[5];

    // Day 5 and Day 6 are exploration days beyond the 3 curated venues
    assert.equal(day5.isExplorationDay, true);
    day5.activities.forEach(act => {
      assert.equal(act.latitude, null, `Activity ${act.title} must have null latitude instead of synthetic offset`);
      assert.equal(act.longitude, null, `Activity ${act.title} must have null longitude instead of synthetic offset`);
    });
  });

  await t.test('ensures zero duplicate activities exist within generated itinerary', () => {
    const itin = generateItinerary({
      destination: { id: 'jaipur', name: 'Jaipur' },
      duration: 3,
      travelStyle: 'Packed'
    });

    const titles = [];
    itin.days.forEach(d => {
      d.activities.forEach(a => {
        titles.push(a.title);
      });
    });

    const unique = new Set(titles);
    assert.equal(unique.size, titles.length, 'Every scheduled activity title must be unique across the entire trip');
  });
});
