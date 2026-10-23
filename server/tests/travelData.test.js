import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import TravelCache from '../src/models/TravelCache.js';
import { searchDestinations, CURATED_DESTINATIONS } from '../src/services/destinationService.js';
import { getDestinationWeather, interpretWeatherCode } from '../src/services/weatherService.js';
import { getDestinationPlaces } from '../src/services/placesService.js';
import {
  searchDestinationsHandler,
  getDestinationPlacesHandler,
  getWeatherHandler
} from '../src/controllers/travelDataController.js';

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

test('--- Travel Data V2: Destination Search & Autocomplete ---', async (t) => {
  await t.test('returns curated catalog when search query is empty', async () => {
    const res = await searchDestinations('');
    assert.ok(Array.isArray(res.destinations));
    assert.equal(res.destinations.length, CURATED_DESTINATIONS.length);
    assert.equal(res.source, 'curated-catalog');
  });

  await t.test('finds curated destination with normalized fields and coordinates', async () => {
    const res = await searchDestinations('Kyoto');
    assert.ok(res.destinations.length > 0);
    const kyoto = res.destinations.find((d) => d.id === 'kyoto');
    assert.ok(kyoto);
    assert.equal(kyoto.name, 'Kyoto');
    assert.equal(kyoto.country, 'Japan');
    assert.equal(typeof kyoto.latitude, 'number');
    assert.equal(typeof kyoto.longitude, 'number');
    assert.ok(kyoto.latitude > 30 && kyoto.latitude < 40);
  });

  await t.test('controller rejects invalid or excessively long search query with 400', async () => {
    const longString = 'a'.repeat(150);
    const req = { query: { q: longString } };
    const res = createMockRes();

    await searchDestinationsHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /100 characters/i);
  });
});

test('--- Travel Data V2: Live Weather Forecast Service ---', async (t) => {
  await t.test('interprets WMO weather codes accurately', () => {
    assert.equal(interpretWeatherCode(0).condition, 'Clear Sky');
    assert.equal(interpretWeatherCode(2).condition, 'Partly Cloudy');
    assert.equal(interpretWeatherCode(61).condition, 'Rain');
    assert.equal(interpretWeatherCode(71).condition, 'Snowfall');
    assert.equal(interpretWeatherCode(95).condition, 'Thunderstorm');
  });

  await t.test('weather controller rejects requests with invalid or missing coordinates with 400', async () => {
    const req = { query: { lat: 'invalid', lng: 'none' } };
    const res = createMockRes();

    await getWeatherHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Valid latitude and longitude/i);
  });

  await t.test('normalizes mock weather provider response cleanly without missing fields', async () => {
    // Mock global fetch to return controlled Open-Meteo payload
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        current_weather: {
          temperature: 24.5,
          windspeed: 8.2,
          weathercode: 1,
          is_day: 1
        },
        daily: {
          time: ['2026-10-23', '2026-10-24'],
          temperature_2m_max: [26.0, 27.2],
          temperature_2m_min: [17.5, 18.0],
          precipitation_probability_max: [10, 45],
          precipitation_sum: [0.0, 3.2],
          weathercode: [1, 61]
        }
      })
    });

    try {
      const originalGetFresh = TravelCache.getFresh;
      const originalSetWithTTL = TravelCache.setWithTTL;
      TravelCache.getFresh = async () => null;
      TravelCache.setWithTTL = async () => null;

      const weather = await getDestinationWeather({
        latitude: 26.9124,
        longitude: 75.7873,
        destination: 'Jaipur'
      });

      assert.equal(weather.success, true);
      assert.equal(weather.provider, 'open-meteo');
      assert.equal(weather.data.current.temperature, 24.5);
      assert.equal(weather.data.current.condition, 'Mainly Clear');
      assert.equal(weather.data.daily.length, 2);
      assert.equal(weather.data.daily[0].tempMax, 26.0);
      assert.equal(weather.data.daily[1].condition, 'Rain');

      TravelCache.getFresh = originalGetFresh;
      TravelCache.setWithTTL = originalSetWithTTL;
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('handles weather provider network timeouts gracefully', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection timeout to meteorological server');
    };

    const originalGetFresh = TravelCache.getFresh;
    TravelCache.getFresh = async () => null;

    try {
      const weather = await getDestinationWeather({
        latitude: 28.6139,
        longitude: 77.2090
      });

      assert.equal(weather.success, false);
      assert.match(weather.message, /timeout/i);
    } finally {
      globalThis.fetch = originalFetch;
      TravelCache.getFresh = originalGetFresh;
    }
  });
});

test('--- Travel Data V2: Verified Places & Dining Service ---', async (t) => {
  await t.test('places controller rejects missing destination parameter with 400', async () => {
    const req = { query: {}, params: {} };
    const res = createMockRes();

    await getDestinationPlacesHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /destination parameter is required/i);
  });

  await t.test('honestly identifies offline catalog when no third-party API keys configured', async () => {
    const origGoogleKey = process.env.GOOGLE_MAPS_API_KEY;
    const origFsqKey = process.env.FOURSQUARE_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.FOURSQUARE_API_KEY;

    try {
      const result = await getDestinationPlaces({ destination: 'Manali', category: 'attraction' });
      assert.equal(result.success, true);
      assert.equal(result.isLive, false);
      assert.equal(result.provider, 'curated-offline-catalog');
      assert.ok(result.places.length > 0);

      const place = result.places[0];
      assert.ok(place.name);
      assert.ok(place.address);
      assert.equal(typeof place.rating, 'number');
      assert.equal(place.source, 'curated-catalog');
    } finally {
      if (origGoogleKey) process.env.GOOGLE_MAPS_API_KEY = origGoogleKey;
      if (origFsqKey) process.env.FOURSQUARE_API_KEY = origFsqKey;
    }
  });

  await t.test('reports missing credentials clearly for uncataloged destination', async () => {
    const origGoogleKey = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.FOURSQUARE_API_KEY;

    try {
      const result = await getDestinationPlaces({ destination: 'FictionalCity999' });
      assert.equal(result.success, true);
      assert.equal(result.isLive, false);
      assert.equal(result.provider, 'none-configured');
      assert.equal(result.places.length, 0);
      assert.match(result.message, /GOOGLE_MAPS_API_KEY or FOURSQUARE_API_KEY/i);
    } finally {
      if (origGoogleKey) process.env.GOOGLE_MAPS_API_KEY = origGoogleKey;
    }
  });
});

test('--- Travel Data V2: TravelCache Model Expiry & Freshness ---', async (t) => {
  await t.test('TravelCache.getFresh recognizes expired entries as stale', async () => {
    const origReadyState = mongoose.connection.readyState;
    mongoose.connection.readyState = 1;
    const originalFindOne = TravelCache.findOne;
    TravelCache.findOne = (query) => ({
      lean: async () => null
    });

    try {
      const fresh = await TravelCache.getFresh('stale_weather_key');
      assert.equal(fresh, null);
    } finally {
      TravelCache.findOne = originalFindOne;
      mongoose.connection.readyState = origReadyState;
    }
  });

  await t.test('TravelCache.setWithTTL creates valid expiration timestamp in the future', async () => {
    const origReadyState = mongoose.connection.readyState;
    mongoose.connection.readyState = 1;
    const originalFindOneAndUpdate = TravelCache.findOneAndUpdate;
    let savedDoc = null;
    TravelCache.findOneAndUpdate = async (query, update) => {
      savedDoc = update.$set;
      return savedDoc;
    };

    try {
      const ttlSeconds = 3600; // 1 hour
      const before = new Date(Date.now() + ttlSeconds * 1000 - 100);
      await TravelCache.setWithTTL('test_key', 'search', 'test_provider', { sample: 123 }, ttlSeconds);

      assert.ok(savedDoc);
      assert.ok(savedDoc.expiresAt instanceof Date);
      assert.ok(savedDoc.expiresAt.getTime() >= before.getTime());
      assert.equal(savedDoc.provider, 'test_provider');
    } finally {
      TravelCache.findOneAndUpdate = originalFindOneAndUpdate;
      mongoose.connection.readyState = origReadyState;
    }
  });
});
