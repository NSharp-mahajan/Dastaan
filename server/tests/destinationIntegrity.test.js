import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_PLACES_CATALOG,
  getPlacesPoolForDestination
} from '../src/services/placesService.js';
import {
  generateItinerary,
  generateItineraryWithLiveRouting
} from '../src/services/itineraryGenerator.js';
import { previewTrip, createTrip } from '../src/controllers/tripController.js';
import { searchDestinations } from '../src/services/destinationService.js';

function createMockRes() {
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
  return res;
}

test('--- Destination Integrity & Image Verification ---', async (t) => {
  await t.test('1. Catalog contains ZERO occurrences of mismatched Himalayan stock photo (/images/image2.jpg)', () => {
    let foundMismatched = 0;
    const violations = [];

    for (const [dest, places] of Object.entries(CURATED_PLACES_CATALOG)) {
      places.forEach(p => {
        if (p.photoUrl && p.photoUrl.includes('image2.jpg')) {
          foundMismatched++;
          violations.push(`${dest}: ${p.name} has photoUrl ${p.photoUrl}`);
        }
      });
    }

    assert.equal(foundMismatched, 0, `Found ${foundMismatched} places with /images/image2.jpg:\n${violations.join('\n')}`);
  });

  await t.test('2. Bosphorus Strait Ferry has an authentic photo of Bosphorus/Istanbul', () => {
    const istanbulPlaces = CURATED_PLACES_CATALOG['istanbul'];
    assert.ok(Array.isArray(istanbulPlaces));
    const bosphorus = istanbulPlaces.find(p => p.placeId === 'istanbul_bosphorus_cruise');
    assert.ok(bosphorus, 'Bosphorus ferry place should exist');
    assert.ok(bosphorus.photoUrl, 'Should have photoUrl');
    assert.ok(!bosphorus.photoUrl.includes('image2.jpg'), 'Must NOT use /images/image2.jpg');
    assert.match(bosphorus.photoUrl, /unsplash\.com/, 'Should use authentic high-res Unsplash photo');
  });

  await t.test('3. Kyoto Gion, Florence Ponte Vecchio, and Mostar Koski Mosque have authentic photos', () => {
    const kyotoGion = CURATED_PLACES_CATALOG['kyoto']?.find(p => p.placeId === 'kyoto_gion');
    const ponteVecchio = CURATED_PLACES_CATALOG['florence']?.find(p => p.placeId === 'florence_ponte_vecchio');
    const koskiMosque = CURATED_PLACES_CATALOG['mostar']?.find(p => p.placeId === 'mostar_koski_mosque');

    assert.ok(kyotoGion && !kyotoGion.photoUrl.includes('image2.jpg'));
    assert.ok(ponteVecchio && !ponteVecchio.photoUrl.includes('image2.jpg'));
    assert.ok(koskiMosque && !koskiMosque.photoUrl.includes('image2.jpg'));
  });

  await t.test('4. End-to-End: Vancouver generation retains Vancouver identity throughout response', async () => {
    const req = {
      body: {
        destination: {
          id: 'vancouver-canada',
          name: 'Vancouver',
          country: 'Canada',
          countryCode: 'CA',
          latitude: 49.2827,
          longitude: -123.1207,
          image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1800&q=80'
        },
        duration: 3,
        budget: 35000,
        interests: ['nature', 'art', 'food'],
        travelStyle: 'Balanced'
      }
    };

    const res = createMockRes();
    await previewTrip(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.success);
    const trip = res.body.data;

    // Destination identity verification
    assert.equal(trip.destination.name, 'Vancouver');
    assert.equal(trip.destination.country, 'Canada');
    assert.equal(trip.destination.latitude, 49.2827);
    assert.equal(trip.destination.longitude, -123.1207);

    // Tagline verification
    assert.ok(trip.itinerary.tagline.includes('Vancouver'), `Tagline should mention Vancouver: ${trip.itinerary.tagline}`);
    assert.ok(!trip.itinerary.tagline.includes('Istanbul'), 'Tagline must NOT mention Istanbul');

    // Day activities verification
    assert.ok(Array.isArray(trip.itinerary.days));
    assert.equal(trip.itinerary.days.length, 3);

    const allTitles = trip.itinerary.days.flatMap(d => d.activities.map(a => a.title));
    const allImages = trip.itinerary.days.flatMap(d => d.activities.map(a => a.image));

    // Ensure zero Istanbul places leaked into Vancouver itinerary
    assert.ok(!allTitles.some(t => /Hagia Sophia|Blue Mosque|Bosphorus|Topkapi|Galata Tower/i.test(t)), 'Must not contain Istanbul landmarks');

    // Ensure zero /images/image2.jpg images exist
    assert.ok(!allImages.some(img => img && img.includes('image2.jpg')), 'Must not contain /images/image2.jpg');
  });

  await t.test('5. Proximity verification: Distant coordinates do not match curated catalog by substring', async () => {
    // Vancouver coordinates: lat 49.28, lng -123.12
    const places = await getPlacesPoolForDestination('Vancouver', 49.2827, -123.1207);

    // Check none of the places belong to Manali, Jaipur, New Delhi, or Istanbul
    const placesFromIndiaOrTurkey = places.filter(p =>
      p.address && /(India|Turkey|Rajasthan|Himachal|Fatih|Sultanahmet)/i.test(p.address)
    );
    assert.equal(placesFromIndiaOrTurkey.length, 0, 'Must not return places from India or Turkey for Vancouver coordinates');
  });

  await t.test('6. Autocomplete search distinguishes Vancouver accurately', async () => {
    const results = await searchDestinations('Vancouver');
    assert.ok(Array.isArray(results.destinations));
    assert.ok(results.destinations.length > 0);
    const first = results.destinations[0];
    assert.match(first.name, /Vancouver/i);
    assert.equal(typeof first.latitude, 'number');
    assert.equal(typeof first.longitude, 'number');
    assert.ok(Math.abs(first.latitude - 49.28) < 1.0, `Latitude should be near 49.28, got ${first.latitude}`);
  });
  await t.test('7. createTrip preserves destination coordinates and does not default international country to India', async () => {
    const req = {
      user: { _id: '507f1f77bcf86cd799439011', uid: 'test-user-123' },
      body: {
        destination: {
          id: 'vancouver-canada',
          name: 'Vancouver',
          country: 'Canada',
          countryCode: 'CA',
          latitude: 49.2827,
          longitude: -123.1207,
          image: 'https://images.unsplash.com/vancouver.jpg'
        },
        duration: 3,
        budget: 45000,
        interests: ['nature'],
        travelStyle: 'Balanced',
        itinerary: { days: [{ dayNum: 1, activities: [{ title: 'Stanley Park', placeId: 'van_1' }] }] }
      }
    };

    const res = createMockRes();
    await createTrip(req, res, () => {});

    assert.equal(res.statusCode, 201);
    assert.ok(res.body.success);
    const saved = res.body.data;
    assert.equal(saved.destination.name, 'Vancouver');
    assert.equal(saved.destination.country, 'Canada');
    assert.equal(saved.destination.countryCode, 'CA');
    assert.equal(saved.destination.latitude, 49.2827);
    assert.equal(saved.destination.longitude, -123.1207);
  });
});