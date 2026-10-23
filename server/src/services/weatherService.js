import TravelCache from '../models/TravelCache.js';
import { getDestinationDetails } from './destinationService.js';

/**
 * Maps WMO weather interpretation codes to human-readable conditions and descriptive icons
 */
export function interpretWeatherCode(code) {
  const c = parseInt(code, 10);
  switch (c) {
    case 0:
      return { condition: 'Clear Sky', icon: '☀️' };
    case 1:
      return { condition: 'Mainly Clear', icon: '🌤️' };
    case 2:
      return { condition: 'Partly Cloudy', icon: '⛅' };
    case 3:
      return { condition: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { condition: 'Fog & Mist', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Light Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snowfall', icon: '❄️' };
    case 77:
      return { condition: 'Snow Grains', icon: '🌨️' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', icon: '🌧️' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', icon: '🌨️' };
    case 95:
      return { condition: 'Thunderstorm', icon: '⛈️' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Hail', icon: '⛈️' };
    default:
      return { condition: 'Fair Weather', icon: '🌤️' };
  }
}

/**
 * Retrieve live weather forecast for destination coordinates
 *
 * @param {Object} options
 * @param {number} [options.latitude]
 * @param {number} [options.longitude]
 * @param {string} [options.destination]
 * @returns {Promise<Object>}
 */
export async function getDestinationWeather({ latitude, longitude, destination }) {
  let lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
  let lng = typeof longitude === 'number' ? longitude : parseFloat(longitude);

  // If coordinates are missing, attempt lookup from destination name
  if ((isNaN(lat) || isNaN(lng)) && destination) {
    const dest = await getDestinationDetails(destination);
    if (dest && typeof dest.latitude === 'number' && typeof dest.longitude === 'number') {
      lat = dest.latitude;
      lng = dest.longitude;
    }
  }

  if (isNaN(lat) || isNaN(lng)) {
    return {
      success: false,
      message: 'Valid latitude and longitude coordinates are required to retrieve weather forecast.',
      data: null
    };
  }

  // Round coordinates to 2 decimals for optimal cache deduplication (~1.1km grouping)
  const roundLat = Math.round(lat * 100) / 100;
  const roundLng = Math.round(lng * 100) / 100;
  const cacheKey = `weather:${roundLat}:${roundLng}`;

  // 1. Check MongoDB Cache (2-hour TTL)
  const cached = await TravelCache.getFresh(cacheKey);
  if (cached && cached.data) {
    return {
      success: true,
      cached: true,
      provider: cached.provider,
      retrievedAt: cached.retrievedAt,
      data: cached.data
    };
  }

  // 2. Fetch Live from Open-Meteo API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${roundLat}&longitude=${roundLng}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto`;

    const response = await fetch(weatherUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DastaanTravel/2.0'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Open-Meteo returned HTTP ${response.status}`);
    }

    const raw = await response.json();

    // 3. Normalize Current Weather
    const currentWeatherCode = raw.current_weather?.weathercode ?? 0;
    const currentInterpretation = interpretWeatherCode(currentWeatherCode);

    const current = {
      temperature: raw.current_weather?.temperature ?? null,
      windSpeed: raw.current_weather?.windspeed ?? null,
      weatherCode: currentWeatherCode,
      condition: currentInterpretation.condition,
      icon: currentInterpretation.icon,
      isDay: Boolean(raw.current_weather?.is_day ?? 1)
    };

    // 4. Normalize 7-Day Daily Forecast
    const daily = [];
    const dailyTimes = raw.daily?.time || [];
    const maxTemps = raw.daily?.temperature_2m_max || [];
    const minTemps = raw.daily?.temperature_2m_min || [];
    const precipProb = raw.daily?.precipitation_probability_max || [];
    const precipSum = raw.daily?.precipitation_sum || [];
    const weatherCodes = raw.daily?.weathercode || [];

    for (let i = 0; i < dailyTimes.length; i++) {
      const code = weatherCodes[i] ?? 0;
      const interp = interpretWeatherCode(code);
      daily.push({
        date: dailyTimes[i],
        tempMax: maxTemps[i] ?? null,
        tempMin: minTemps[i] ?? null,
        precipitationProbability: precipProb[i] ?? 0,
        precipitationSumMm: precipSum[i] ?? 0,
        weatherCode: code,
        condition: interp.condition,
        icon: interp.icon
      });
    }

    const payload = {
      destination: destination || null,
      coordinates: { latitude: roundLat, longitude: roundLng },
      current,
      daily,
      provider: 'open-meteo',
      retrievedAt: new Date().toISOString()
    };

    // 5. Store in MongoDB Cache (2 hours = 7200 seconds)
    await TravelCache.setWithTTL(cacheKey, 'weather', 'open-meteo', payload, 7200);

    return {
      success: true,
      cached: false,
      provider: 'open-meteo',
      retrievedAt: payload.retrievedAt,
      data: payload
    };
  } catch (err) {
    console.error(`[WeatherService] Forecast lookup failed: ${err.message}`);
    return {
      success: false,
      message: `Weather forecast unavailable: ${err.message}`,
      data: null
    };
  }
}
