import { searchDestinations, CURATED_DESTINATIONS } from '../services/destinationService.js';
import { getDestinationWeather } from '../services/weatherService.js';
import { getDestinationPlaces } from '../services/placesService.js';

/**
 * GET /api/destinations/search?q=Kyoto
 * Searches destinations dynamically using live geocoding and caching.
 */
export const searchDestinationsHandler = async (req, res) => {
  try {
    const rawQuery = req.query?.q || req.query?.query || '';

    // Validation: Limit length to prevent buffer/DOS attacks
    if (typeof rawQuery !== 'string' || rawQuery.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search query. Query must be text under 100 characters.'
      });
    }

    const result = await searchDestinations(rawQuery);

    return res.status(200).json({
      success: true,
      count: result.count,
      source: result.source,
      provider: result.provider,
      data: result.destinations
    });
  } catch (err) {
    console.error('[TravelDataController] Search error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to search destinations: ' + err.message
    });
  }
};

/**
 * GET /api/destinations/popular
 * Returns list of popular curated destinations
 */
export const getPopularDestinationsHandler = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: CURATED_DESTINATIONS.length,
      data: CURATED_DESTINATIONS
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve popular destinations: ' + err.message
    });
  }
};

/**
 * GET /api/destinations/places?destination=Jaipur&category=attractions
 * Retrieves verified attractions and dining spots for a destination
 */
export const getDestinationPlacesHandler = async (req, res) => {
  try {
    const destination = req.query?.destination || req.query?.dest || req.params?.destination || '';
    const category = req.query?.category || req.query?.type || 'all';
    const latitude = req.query?.lat || req.query?.latitude;
    const longitude = req.query?.lng || req.query?.longitude;

    if (!destination || typeof destination !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A destination parameter is required to discover places.'
      });
    }

    const result = await getDestinationPlaces({
      destination: destination.trim(),
      category: category.trim(),
      latitude,
      longitude
    });

    return res.status(200).json({
      success: result.success,
      count: result.count,
      isLive: result.isLive,
      provider: result.provider,
      message: result.message || null,
      data: result.places
    });
  } catch (err) {
    console.error('[TravelDataController] Places lookup error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve destination places: ' + err.message
    });
  }
};

/**
 * GET /api/weather?latitude=35.01&longitude=135.76&destination=Kyoto
 * Retrieves live current weather and 7-day forecast
 */
export const getWeatherHandler = async (req, res) => {
  try {
    const latitude = req.query?.latitude || req.query?.lat;
    const longitude = req.query?.longitude || req.query?.lng || req.query?.lon;
    const destination = req.query?.destination || req.query?.name || '';

    const result = await getDestinationWeather({
      latitude,
      longitude,
      destination: typeof destination === 'string' ? destination.trim() : ''
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      cached: result.cached,
      provider: result.provider,
      retrievedAt: result.retrievedAt,
      data: result.data
    });
  } catch (err) {
    console.error('[TravelDataController] Weather error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve weather forecast: ' + err.message
    });
  }
};
