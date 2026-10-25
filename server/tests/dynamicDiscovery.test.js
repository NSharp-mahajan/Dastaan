import test from 'node:test';
import assert from 'node:assert/strict';
import { searchDestinations, getDestinationDetails } from '../src/services/destinationService.js';
import {
  normalizeWikimediaPlace,
  queryWikimediaPlaces,
  getDestinationPlaces,
  getPlacesPoolForDestination
} from '../src/services/placesService.js';
import {
  generateItinerary,
  generateItineraryWithLiveRouting
} from '../src/services/itineraryGenerator.js';
import { previewTrip } from '../src/controllers/tripController.js';
import TravelCache from '../src/models/TravelCache.js';

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

test('--- Dynamic Discovery: Global Destination Search & Autocomplete ---', async (t) => {
  await t.test('searchDestinations returns popular curated destinations when query is empty', async () => {
    const res = await searchDestinations('');
    assert.equal(res.source, 'curated-catalog');
    assert.ok(Array.isArray(res.destinations));
    assert.ok(res.destinations.length >= 7);
    const delhi = res.destinations.find(d => d.id === 'new-delhi');
    assert.ok(delhi);
    assert.equal(typeof delhi.latitude, 'number');
    assert.equal(typeof delhi.longitude, 'number');
  });

  await t.test('searchDestinations prioritizes exact curated matches immediately', async () => {
    const res = await searchDestinations('Jaipur');
    assert.equal(res.source, 'curated-exact');
    assert.equal(res.destinations[0].id, 'jaipur');
    assert.equal(res.destinations[0].country, 'India');
    assert.equal(typeof res.destinations[0].latitude, 'number');
  });

  await t.test('searchDestinations resolves arbitrary global destinations with coordinates and location context', async () => {
    const res = await searchDestinations('Sydney');
    assert.ok(Array.isArray(res.destinations));
    assert.ok(res.destinations.length > 0);
    const sydney = res.destinations[0];
    assert.match(sydney.name, /Sydney/i);
    assert.equal(sydney.country, 'Australia');
    assert.equal(sydney.countryCode, 'AU');
    assert.ok(sydney.latitude < 0); // Southern hemisphere
    assert.ok(sydney.longitude > 100);
  });

  await t.test('searchDestinations distinguishes ambiguous global destinations by region and country', async () => {
    const res = await searchDestinations('Cairo');
    assert.ok(Array.isArray(res.destinations));
    assert.ok(res.destinations.length >= 1);
    const primary = res.destinations.find(d => d.country === 'Egypt');
    assert.ok(primary, 'Found Cairo, Egypt');
    assert.ok(typeof primary.latitude === 'number');
    assert.ok(typeof primary.longitude === 'number');
  });

  await t.test('searchDestinations handles empty or unknown queries gracefully without crashing', async () => {
    const res = await searchDestinations('NonExistentPlaceZzz999');
    assert.ok(Array.isArray(res.destinations));
    // Should return 0 or safe array without throwing
  });
});

test('--- Dynamic Discovery: Live Attraction Normalization & Schema Integrity ---', async (t) => {
  await t.test('normalizeWikimediaPlace creates compliant Dastaan activity schema without inventing ratings', () => {
    const sampleWikiPage = {
      pageid: 98765,
      title: 'Sydney Opera House',
      description: 'Multi-venue performing arts centre in Sydney, Australia',
      extract: 'The Sydney Opera House is a multi-venue performing arts centre at Sydney Harbour in Sydney, New South Wales, Australia.',
      coordinates: [{ lat: -33.8568, lon: 151.2153 }],
      thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/opera.jpg', width: 600, height: 400 }
    };

    const place = normalizeWikimediaPlace(sampleWikiPage, 'Sydney');

    assert.equal(place.placeId, 'wiki_98765');
    assert.equal(place.name, 'Sydney Opera House');
    assert.equal(place.cat, 'ART');
    assert.equal(place.category, 'attraction');
    assert.equal(place.latitude, -33.8568);
    assert.equal(place.longitude, 151.2153);
    assert.equal(place.rating, null); // Strictly null, not synthetic 4.8
    assert.equal(place.reviewCount, null);
    assert.equal(place.photoUrl, 'https://upload.wikimedia.org/wikipedia/commons/opera.jpg');
    assert.equal(place.visitDurationHours, 2.0); // Defensible art/theatre estimate
    assert.equal(place.source, 'wikimedia-geosearch');
    assert.match(place.attribution, /Wikipedia/i);
  });

  await t.test('normalizeWikimediaPlace classifies natural landmarks and parks with appropriate visit duration', () => {
    const samplePark = {
      pageid: 11223,
      title: 'Royal Botanic Garden, Sydney',
      description: 'Heritage-listed 30-hectare botanical garden in Sydney',
      coordinates: [{ lat: -33.8642, lon: 151.2166 }]
    };

    const place = normalizeWikimediaPlace(samplePark, 'Sydney');
    assert.equal(place.cat, 'NATURE');
    assert.equal(place.visitDurationHours, 1.5);
    assert.equal(place.isOpen, true);
    assert.equal(place.openingHours, null);
  });

  await t.test('queryWikimediaPlaces handles network errors and timeouts gracefully', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection timeout to geosearch provider');
    };

    try {
      const places = await queryWikimediaPlaces({
        destination: 'TestCity',
        latitude: 10.0,
        longitude: 20.0
      });
      assert.ok(Array.isArray(places));
      assert.equal(places.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('--- Dynamic Discovery: Places Service Provider Waterfall & Caching ---', async (t) => {
  await t.test('getDestinationPlaces falls back to live Wikimedia Geosearch for uncataloged destination', async () => {
    const origKey = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.FOURSQUARE_API_KEY;

    try {
      const result = await getDestinationPlaces({
        destination: 'Sydney',
        latitude: -33.8688,
        longitude: 151.2093,
        category: 'attraction'
      });

      assert.equal(result.success, true);
      assert.ok(Array.isArray(result.places));
      assert.ok(result.places.length > 0);
      assert.equal(result.provider, 'wikimedia-geosearch');
      assert.equal(result.isLive, true);

      // Verify every returned place has valid coordinates
      result.places.forEach(p => {
        assert.equal(typeof p.latitude, 'number');
        assert.equal(typeof p.longitude, 'number');
        assert.ok(p.name);
      });
    } finally {
      if (origKey) process.env.GOOGLE_MAPS_API_KEY = origKey;
    }
  });

  await t.test('getPlacesPoolForDestination retrieves live places for dynamic destination', async () => {
    const places = await getPlacesPoolForDestination('Sydney', -33.8688, 151.2093);
    assert.ok(Array.isArray(places));
    assert.ok(places.length > 0);
    assert.ok(places[0].latitude !== null);
  });
});

test('--- Dynamic Discovery: Itinerary Optimizer Integration with Live Places ---', async (t) => {
  await t.test('generateItineraryWithLiveRouting clusters and routes live discovered places worldwide', async () => {
    const destination = {
      id: 'sydney-australia',
      name: 'Sydney',
      country: 'Australia',
      countryCode: 'AU',
      latitude: -33.8688,
      longitude: 151.2093
    };

    const itinerary = await generateItineraryWithLiveRouting({
      destination,
      duration: 2,
      budget: 25000,
      travelStyle: 'Balanced',
      interests: ['Culture & History', 'Nature & Outdoors']
    });

    assert.ok(itinerary);
    assert.equal(itinerary.days.length, 2);

    // Day 1 should have live-discovered activities with coordinates
    const day1 = itinerary.days[0];
    assert.ok(day1.activities.length >= 2);
    assert.ok(day1.route);
    assert.ok(day1.feasibility);
    assert.equal(day1.feasibility.isFeasible, true);

    // Verify activities have real coordinates and attribution
    day1.activities.forEach(act => {
      assert.ok(act.title);
      assert.equal(typeof act.latitude, 'number');
      assert.equal(typeof act.longitude, 'number');
      assert.equal(act.source, 'wikimedia-geosearch');
      assert.match(act.attribution, /Wikipedia/i);
    });

    // Verify road/geodesic routing was calculated between consecutive activities
    assert.ok(typeof day1.route.distanceKm === 'number');
    assert.ok(typeof day1.route.durationMin === 'number');
    assert.ok(day1.route.legs.length > 0);
  });

  await t.test('extended days beyond discovered place count transition honestly to exploration days', async () => {
    const destination = {
      id: 'sydney-australia',
      name: 'Sydney',
      latitude: -33.8688,
      longitude: 151.2093
    };

    // Request 10-day trip with only ~8 discovered places
    const itinerary = await generateItineraryWithLiveRouting({
      destination,
      duration: 10,
      budget: 50000,
      travelStyle: 'Balanced'
    });

    assert.equal(itinerary.days.length, 10);
    const lastDay = itinerary.days[9];
    assert.equal(lastDay.isExplorationDay, true);
    // Exploration activities must have null coordinates rather than fabricated offsets
    lastDay.activities.forEach(act => {
      assert.equal(act.latitude, null);
      assert.equal(act.longitude, null);
      assert.equal(act.isSelfGuided, true);
    });
  });
});

test('--- Dynamic Discovery: Public Guest Preview Endpoint End-to-End ---', async (t) => {
  await t.test('POST /api/trips/preview generates full preview for user-entered destination', async () => {
    const req = {
      body: {
        destination: {
          id: 'cairo-egypt',
          name: 'Cairo',
          country: 'Egypt',
          countryCode: 'EG',
          latitude: 30.0626,
          longitude: 31.2497
        },
        duration: 2,
        budget: 15000,
        travelStyle: 'Balanced',
        interests: ['Culture & History', 'Heritage']
      }
    };
    const res = createMockRes();

    await previewTrip(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isGuestPreview, true);
    assert.equal(res.body.data.destination.name, 'Cairo');
    assert.equal(res.body.data.destination.latitude, 30.0626);
    assert.equal(res.body.data.destination.longitude, 31.2497);

    const itin = res.body.data.itinerary;
    assert.equal(itin.days.length, 2);
    assert.ok(itin.days[0].activities.length > 0);
    assert.ok(itin.days[0].route);
  });
});

test('--- Dynamic Discovery: Real API Smoke Test (Two Geographically Distinct Cities) ---', async (t) => {
  // Test City 1: Cairo, Egypt (Africa / Middle East)
  await t.test('Smoke test: Cairo live discovery returns verified places with real coordinates', async () => {
    const cairoPlaces = await queryWikimediaPlaces({
      destination: 'Cairo',
      latitude: 30.0626,
      longitude: 31.2497
    });

    assert.ok(Array.isArray(cairoPlaces));
    assert.ok(cairoPlaces.length > 0, 'Cairo returned live places');
    const first = cairoPlaces[0];
    assert.ok(first.name);
    assert.equal(typeof first.latitude, 'number');
    assert.equal(typeof first.longitude, 'number');
    assert.ok(first.latitude > 29 && first.latitude < 31);
    assert.equal(first.source, 'wikimedia-geosearch');
  });

  // Test City 2: Sydney, Australia (Oceania / Southern Hemisphere)
  await t.test('Smoke test: Sydney live discovery returns verified places with real coordinates', async () => {
    const sydneyPlaces = await queryWikimediaPlaces({
      destination: 'Sydney',
      latitude: -33.8688,
      longitude: 151.2093
    });

    assert.ok(Array.isArray(sydneyPlaces));
    assert.ok(sydneyPlaces.length > 0, 'Sydney returned live places');
    const first = sydneyPlaces[0];
    assert.ok(first.name);
    assert.equal(typeof first.latitude, 'number');
    assert.equal(typeof first.longitude, 'number');
    assert.ok(first.latitude < -30);
    assert.equal(first.source, 'wikimedia-geosearch');
  });
});
