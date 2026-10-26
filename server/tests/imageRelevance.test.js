import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDestinationHeroImage,
  getAttractionPhoto,
  enrichActivitiesWithAuthenticImages,
  isGenericOrStockImage
} from '../src/services/imageService.js';
import {
  generateItinerary,
  generateItineraryWithLiveRouting,
  recalculateItinerary
} from '../src/services/itineraryGenerator.js';
import { searchDestinations } from '../src/services/destinationService.js';
import { previewTrip, recalculateTripItinerary } from '../src/controllers/tripController.js';
import { CURATED_PLACES_CATALOG } from '../src/services/placesService.js';
import TravelCache from '../src/models/TravelCache.js';

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

test('--- Image Pipeline: Destination Hero & Attraction Photography ---', async (t) => {

  await t.test('1. Different destinations receive different, contextually relevant hero images', async () => {
    const vancouverHero = await getDestinationHeroImage({ name: 'Vancouver', country: 'Canada' });
    const tokyoHero = await getDestinationHeroImage({ name: 'Tokyo', country: 'Japan' });
    const cairoHero = await getDestinationHeroImage({ name: 'Cairo', country: 'Egypt' });

    assert.ok(vancouverHero && vancouverHero.url, 'Vancouver hero image must exist');
    assert.ok(tokyoHero && tokyoHero.url, 'Tokyo hero image must exist');
    assert.ok(cairoHero && cairoHero.url, 'Cairo hero image must exist');

    // All three images must be completely distinct
    assert.notEqual(vancouverHero.url, tokyoHero.url, 'Vancouver and Tokyo must not share the same hero image');
    assert.notEqual(vancouverHero.url, cairoHero.url, 'Vancouver and Cairo must not share the same hero image');
    assert.notEqual(tokyoHero.url, cairoHero.url, 'Tokyo and Cairo must not share the same hero image');

    // Ensure none are generic stock photos
    assert.ok(!isGenericOrStockImage(vancouverHero.url));
    assert.ok(!isGenericOrStockImage(tokyoHero.url));
    assert.ok(!isGenericOrStockImage(cairoHero.url));
  });

  await t.test('2. Different attractions preserve their own specific image associations without repetition', async () => {
    const stanleyPhoto = await getAttractionPhoto('Stanley Park', 'Vancouver');
    const uffiziPhoto = await getAttractionPhoto('Uffizi Gallery', 'Florence');

    assert.ok(stanleyPhoto && stanleyPhoto.url, 'Stanley Park photo should be resolved');
    assert.ok(uffiziPhoto && uffiziPhoto.url, 'Uffizi Gallery photo should be resolved');
    assert.notEqual(stanleyPhoto.url, uffiziPhoto.url, 'Stanley Park and Uffizi must have distinct photos');

    // Verify attribution metadata is preserved
    assert.ok(stanleyPhoto.attribution, 'Stanley Park must have attribution');
    assert.match(stanleyPhoto.attribution, /Wikimedia Commons/i);
    assert.ok(uffiziPhoto.attribution, 'Uffizi Gallery must have attribution');
  });

  await t.test('3. Missing images produce null/neutral fallback rather than a misleading stock photo', async () => {
    // Non-existent fictitious attraction name should return null
    const nonExistent = await getAttractionPhoto('FictitiousNonExistentPlaceXYZ987', 'Vancouver');
    assert.equal(nonExistent, null, 'Unmatched attraction should return null, not a random photo');

    const activities = [
      { title: 'FictitiousNonExistentPlaceXYZ987', cat: 'CULTURE', image: null, photoUrl: null }
    ];
    const enriched = await enrichActivitiesWithAuthenticImages(activities, 'Vancouver');
    assert.equal(enriched[0].image, null, 'Should retain null image for clean UI placeholder');
    assert.equal(enriched[0].photoUrl, null);
  });

  await t.test('4. Image lookup network errors or timeouts do not break itinerary generation', async () => {
    const itin = await generateItineraryWithLiveRouting({
      destination: {
        id: 'mock-island',
        name: 'Mock Island',
        country: 'Nowhere',
        latitude: 0,
        longitude: 0
      },
      duration: 2,
      budget: 15000,
      travelStyle: 'Balanced',
      interests: ['nature']
    });

    assert.ok(itin);
    assert.ok(Array.isArray(itin.days));
    assert.equal(itin.days.length, 2);
    // All activities should still have titles, categories, and feasibility intact
    assert.ok(itin.days[0].activities.length > 0);
    assert.ok(itin.days[0].feasibility.isFeasible);
  });

  await t.test('5. Image associations survive activity reordering, recalculation, and persistence', async () => {
    const originalItinerary = {
      days: [
        {
          dayNum: 1,
          dayTitle: 'VANCOUVER LANDMARKS',
          activities: [
            {
              title: 'Stanley Park',
              cat: 'NATURE',
              image: 'https://upload.wikimedia.org/stanley_park.jpg',
              photoUrl: 'https://upload.wikimedia.org/stanley_park.jpg',
              attribution: 'Stanley Park via Wikimedia Commons',
              latitude: 49.3017,
              longitude: -123.1417,
              visitDurationHours: 2.0
            },
            {
              title: 'Granville Island',
              cat: 'CULTURE',
              image: 'https://upload.wikimedia.org/granville_island.jpg',
              photoUrl: 'https://upload.wikimedia.org/granville_island.jpg',
              attribution: 'Granville Island via Wikimedia Commons',
              latitude: 49.2712,
              longitude: -123.1340,
              visitDurationHours: 1.5
            }
          ]
        }
      ]
    };

    // Swap activity order (Move Granville Island before Stanley Park)
    const modifiedItinerary = {
      ...originalItinerary,
      days: [
        {
          ...originalItinerary.days[0],
          activities: [
            originalItinerary.days[0].activities[1], // Granville Island
            originalItinerary.days[0].activities[0]  // Stanley Park
          ]
        }
      ]
    };

    const recalculated = await recalculateItinerary({
      destination: { name: 'Vancouver', latitude: 49.28, longitude: -123.12 },
      travelStyle: 'Balanced',
      itinerary: modifiedItinerary
    });

    assert.equal(recalculated.days[0].activities[0].title, 'Granville Island');
    assert.equal(recalculated.days[0].activities[0].image, 'https://upload.wikimedia.org/granville_island.jpg');
    assert.equal(recalculated.days[0].activities[0].attribution, 'Granville Island via Wikimedia Commons');

    assert.equal(recalculated.days[0].activities[1].title, 'Stanley Park');
    assert.equal(recalculated.days[0].activities[1].image, 'https://upload.wikimedia.org/stanley_park.jpg');
    assert.equal(recalculated.days[0].activities[1].attribution, 'Stanley Park via Wikimedia Commons');
  });

  await t.test('6. Curated catalog contains zero cross-city photo duplications or generic stock images', () => {
    let crossCityIssues = 0;
    const violations = [];

    for (const [dest, places] of Object.entries(CURATED_PLACES_CATALOG)) {
      places.forEach((p) => {
        if (/image\d\.jpg/.test(p.photoUrl)) {
          crossCityIssues++;
          violations.push(`${dest}: ${p.name} has generic stock image ${p.photoUrl}`);
        }
        if (dest !== 'new-delhi' && p.photoUrl.includes('/newdelhi/')) {
          crossCityIssues++;
          violations.push(`${dest}: ${p.name} has Delhi photo ${p.photoUrl}`);
        }
        if (dest !== 'jaipur' && p.photoUrl.includes('/jaipur/')) {
          crossCityIssues++;
          violations.push(`${dest}: ${p.name} has Jaipur photo ${p.photoUrl}`);
        }
        if (dest !== 'manali' && p.photoUrl.includes('/manali/')) {
          crossCityIssues++;
          violations.push(`${dest}: ${p.name} has Manali photo ${p.photoUrl}`);
        }
      });
    }

    assert.equal(crossCityIssues, 0, `Catalog contains photo duplication issues:\n${violations.join('\n')}`);
  });

  await t.test('7. Real Live Smoke Test: Verified photography for 2 distinct destinations and attractions', async () => {
    // Destination A: Vancouver
    const vancouverHero = await getDestinationHeroImage({ name: 'Vancouver', country: 'Canada' });
    assert.ok(vancouverHero && vancouverHero.url.startsWith('https://'));
    assert.match(vancouverHero.attribution, /Wikimedia/i);

    const stanleyPlace = await getAttractionPhoto('Stanley Park', 'Vancouver');
    assert.ok(stanleyPlace && stanleyPlace.url.startsWith('https://'));

    // Destination B: Sydney
    const sydneyHero = await getDestinationHeroImage({ name: 'Sydney', country: 'Australia' });
    assert.ok(sydneyHero && sydneyHero.url.startsWith('https://'));

    const operaHouse = await getAttractionPhoto('Sydney Opera House', 'Sydney');
    assert.ok(operaHouse && operaHouse.url.startsWith('https://'));

    // Verify completely different hero images and attraction photos
    assert.notEqual(vancouverHero.url, sydneyHero.url, 'Vancouver and Sydney hero images must be distinct');
    assert.notEqual(stanleyPlace.url, operaHouse.url, 'Stanley Park and Sydney Opera House must have distinct photos');
  });

  await t.test('8. Attraction-to-image association for dynamically discovered places in arbitrary destinations', async () => {
    // Dynamically discovered attractions in Chandigarh
    const pu = await getAttractionPhoto('Panjab University', 'Chandigarh', { latitude: 30.76, longitude: 76.77 });
    const stadium = await getAttractionPhoto('Sector 16 Stadium', 'Chandigarh', { latitude: 30.74, longitude: 76.78 });

    assert.ok(pu && pu.url, 'Panjab University must resolve an authentic photo');
    assert.ok(stadium && stadium.url, 'Sector 16 Stadium must resolve an authentic photo');

    assert.match(pu.url, /wikimedia\.org/i, 'Panjab University photo must come from verified Wikimedia Commons');
    assert.match(stadium.url, /wikimedia\.org/i, 'Sector 16 Stadium photo must come from verified Wikimedia Commons');

    assert.notEqual(pu.url, stadium.url, 'Panjab University and Sector 16 Stadium must not share the same photo');

    // Verify metadata and licensing
    assert.ok(pu.attribution, 'Panjab University must preserve attribution');
    assert.equal(pu.license, 'CC BY-SA 4.0', 'Must preserve licensing metadata');
    assert.ok(stadium.attribution, 'Sector 16 Stadium must preserve attribution');
    assert.equal(stadium.license, 'CC BY-SA 4.0', 'Must preserve licensing metadata');
  });

  await t.test('9. Geographic mismatch rejection: Geographically mismatched candidate is rejected', async () => {
    // Searching for Eiffel Tower (Paris) with Chandigarh coordinates (~6000km away) must be rejected
    const mismatched = await getAttractionPhoto('Eiffel Tower', 'Chandigarh', { latitude: 30.7333, longitude: 76.7794 });
    assert.equal(mismatched, null, 'Eiffel Tower in Chandigarh coordinates must be rejected as null');
  });

  await t.test('10. Two unknown attractions never share an unrelated fallback image', async () => {
    const unknownPlace1 = 'UnknownHiddenGemA101';
    const unknownPlace2 = 'UnknownHiddenGemB202';

    const photo1 = await getAttractionPhoto(unknownPlace1, 'Chandigarh');
    const photo2 = await getAttractionPhoto(unknownPlace2, 'Chandigarh');

    assert.equal(photo1, null, 'Unmatched attraction 1 must be null');
    assert.equal(photo2, null, 'Unmatched attraction 2 must be null');

    const activities = [
      { title: unknownPlace1, cat: 'CULTURE', image: null },
      { title: unknownPlace2, cat: 'NATURE', image: null }
    ];
    const enriched = await enrichActivitiesWithAuthenticImages(activities, 'Chandigarh');

    // Neither receives an unrelated stock photo (e.g. Cinque Terre or mountain landscape)
    assert.equal(enriched[0].image, null, 'Unknown attraction 1 must remain null for clean UI placeholder');
    assert.equal(enriched[1].image, null, 'Unknown attraction 2 must remain null for clean UI placeholder');
  });

  await t.test('11. Generic stock photos are identified and replaced during activity enrichment', async () => {
    const activitiesWithStock = [
      {
        title: 'Sector 16 Stadium',
        cat: 'SPORTS',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', // Mountain landscape stock
        latitude: 30.74,
        longitude: 76.78
      }
    ];

    const enriched = await enrichActivitiesWithAuthenticImages(activitiesWithStock, 'Chandigarh');
    assert.ok(enriched[0].image, 'Stock image should be replaced with authentic photo');
    assert.notEqual(enriched[0].image, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b');
    assert.match(enriched[0].image, /wikimedia\.org/i);
    assert.match(enriched[0].attribution, /Sector 16 Stadium/i);
  });
});
