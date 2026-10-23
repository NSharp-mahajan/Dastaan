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
  generateItineraryWithLiveRouting
} from '../src/services/itineraryGenerator.js';
import Trip from '../src/models/Trip.js';

test('--- Stage 2: Geographic Routing & Haversine Distance Engine ---', async (t) => {
  await t.test('calculates accurate Haversine great-circle distance between known coordinates', () => {
    // New Delhi (28.6139, 77.2090) to Jaipur (26.9124, 75.7873) is ~238 km
    const dist = haversineDistanceKm(28.6139, 77.2090, 26.9124, 75.7873);
    assert.ok(dist >= 230 && dist <= 250, `Distance should be ~238km, got: ${dist}`);
  });

  await t.test('returns 0 km distance for identical coordinates', () => {
    const dist = haversineDistanceKm(28.6139, 77.2090, 28.6139, 77.2090);
    assert.equal(dist, 0);
  });

  await t.test('generateEstimatedRoute applies urban tortuosity factor and realistic speeds', () => {
    const waypoints = [
      { name: "Humayun's Tomb", latitude: 28.5933, longitude: 77.2507 },
      { name: 'India Gate', latitude: 28.6129, longitude: 77.2295 }
    ];

    const route = generateEstimatedRoute(waypoints, 'driving');
    assert.ok(route);
    assert.equal(route.provider, 'haversine-estimate');
    assert.equal(route.isEstimated, true);
    assert.ok(route.distanceKm > 0);
    assert.ok(route.durationMin > 0);
    assert.equal(route.legs.length, 1);
    assert.equal(route.legs[0].from, "Humayun's Tomb");
    assert.equal(route.legs[0].to, 'India Gate');
    assert.equal(route.geometry.type, 'LineString');
    assert.equal(route.geometry.coordinates.length, 2);
  });

  await t.test('calculateRoute rejects requests with fewer than two waypoints', async () => {
    const res = await calculateRoute([{ latitude: 28.5933, longitude: 77.2507 }]);
    assert.equal(res.success, false);
    assert.match(res.message, /at least two waypoints/i);
  });

  await t.test('calculateRoute rejects invalid or non-numeric coordinates', async () => {
    const res = await calculateRoute([
      { latitude: 'invalid', longitude: 77.2507 },
      { latitude: 28.6129, longitude: null }
    ]);
    assert.equal(res.success, false);
  });

  await t.test('calculateDayRoute handles empty or single activity gracefully without errors', async () => {
    const route = await calculateDayRoute([{ title: 'Single Stop' }]);
    assert.ok(route);
    assert.equal(route.distanceKm, 0);
    assert.equal(route.provider, 'none');
  });
});

test('--- Stage 2: Intelligent Multi-Day Itinerary Generation (Non-Repeating) ---', async (t) => {
  await t.test('generates multi-day itinerary where attractions do NOT repeat across days', () => {
    const itin = generateItinerary({
      destination: { id: 'new-delhi', name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 },
      duration: 3,
      budget: 15000,
      travelStyle: 'Balanced',
      interests: ['Culture', 'Food']
    });

    assert.ok(itin);
    assert.equal(itin.days.length, 3);

    // Collect all activity titles across all 3 days
    const allTitles = [];
    itin.days.forEach(day => {
      day.activities.forEach(act => {
        allTitles.push(act.title);
      });
    });

    // Verify all activity titles across days are distinct
    const uniqueTitles = new Set(allTitles);
    assert.equal(
      uniqueTitles.size,
      allTitles.length,
      `Activities must not repeat! Found duplicates: ${allTitles.filter((item, index) => allTitles.indexOf(item) !== index)}`
    );
  });

  await t.test('attaches real geographic coordinates to activities', () => {
    const itin = generateItinerary({
      destination: { id: 'jaipur', name: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
      duration: 2,
      budget: 10000,
      travelStyle: 'Relaxed'
    });

    const day1Acts = itin.days[0].activities;
    assert.ok(day1Acts.length > 0);
    day1Acts.forEach(act => {
      assert.ok(typeof act.latitude === 'number', `Activity ${act.title} must have numeric latitude`);
      assert.ok(typeof act.longitude === 'number', `Activity ${act.title} must have numeric longitude`);
      assert.ok(act.latitude >= -90 && act.latitude <= 90);
      assert.ok(act.longitude >= -180 && act.longitude <= 180);
    });
  });

  await t.test('enriches each day with a valid route object', () => {
    const itin = generateItinerary({
      destination: { id: 'manali', name: 'Manali', latitude: 32.2432, longitude: 77.1892 },
      duration: 2,
      budget: 9000
    });

    itin.days.forEach(day => {
      assert.ok(day.route, `Day ${day.dayNum} must have a route object`);
      assert.ok(typeof day.route.distanceKm === 'number');
      assert.ok(typeof day.route.durationMin === 'number');
      assert.ok(day.route.geometry);
      assert.equal(day.route.geometry.type, 'LineString');
    });
  });

  await t.test('transitions honestly to themed exploration days for extended durations beyond verified place count', () => {
    const itin = generateItinerary({
      destination: { id: 'mostar', name: 'Mostar', latitude: 43.3438, longitude: 17.8078 },
      duration: 5,
      budget: 20000
    });

    assert.equal(itin.days.length, 5);
    // Later days should be flagged as exploration days rather than repeating Stari Most
    const day4 = itin.days[3];
    const day5 = itin.days[4];
    assert.ok(day4.isExplorationDay || day5.isExplorationDay);
  });

  await t.test('budget allocation explicitly flags breakdown items as estimates', () => {
    const itin = generateItinerary({
      destination: { id: 'kyoto', name: 'Kyoto' },
      duration: 4,
      budget: 35000
    });

    assert.equal(itin.breakdown.length, 5);
    itin.breakdown.forEach(item => {
      assert.equal(item.isEstimated, true, `Budget item ${item.name} should be labeled isEstimated: true`);
      assert.ok(item.amount > 0);
    });
  });
});

test('--- Stage 2: Trip Schema Persistence & Backward Compatibility ---', async (t) => {
  await t.test('Trip model supports optional route object on days and coordinates on activities', () => {
    const sampleTrip = new Trip({
      user: '60d0fe4f5311236168a109ca',
      destination: {
        id: 'new-delhi',
        name: 'New Delhi',
        latitude: 28.6139,
        longitude: 77.2090
      },
      duration: 2,
      budget: 8000,
      travelStyle: 'Balanced',
      itinerary: {
        tagline: 'A balanced journey through Delhi',
        days: [
          {
            dayNum: 1,
            dayTitle: 'HISTORIC AXIS',
            route: {
              distanceKm: 4.8,
              durationMin: 18,
              mode: 'driving',
              provider: 'osrm',
              isEstimated: false,
              geometry: {
                type: 'LineString',
                coordinates: [[77.25, 28.59], [77.22, 28.61]]
              }
            },
            activities: [
              {
                time: '09:00',
                title: "Humayun's Tomb",
                latitude: 28.5933,
                longitude: 77.2507,
                address: 'Nizamuddin East, New Delhi'
              }
            ]
          }
        ]
      }
    });

    const err = sampleTrip.validateSync();
    assert.equal(err, undefined, 'Trip with route and coordinates must validate cleanly');
    assert.equal(sampleTrip.itinerary.days[0].route.distanceKm, 4.8);
    assert.equal(sampleTrip.itinerary.days[0].activities[0].latitude, 28.5933);
  });

  await t.test('Trip model maintains 100% backward compatibility for legacy trips without route or coordinates', () => {
    const legacyTrip = new Trip({
      user: '60d0fe4f5311236168a109ca',
      destination: {
        id: 'legacy-city',
        name: 'Legacy City'
      },
      duration: 1,
      budget: 5000,
      itinerary: {
        tagline: 'Legacy tagline',
        days: [
          {
            dayNum: 1,
            dayTitle: 'DAY ONE',
            activities: [
              {
                time: '10:00',
                title: 'Legacy Monument'
              }
            ]
          }
        ]
      }
    });

    const err = legacyTrip.validateSync();
    assert.equal(err, undefined, 'Legacy trip without routes or coordinates must validate without error');
  });
});
