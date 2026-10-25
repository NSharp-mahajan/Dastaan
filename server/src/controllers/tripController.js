import crypto from 'crypto';
import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import { generateItinerary, generateItineraryWithLiveRouting, recalculateItinerary } from '../services/itineraryGenerator.js';
import { getDestinationHeroImage, isGenericOrStockImage } from '../services/imageService.js';

/**
 * Robustly resolves the authenticated user's ID to a valid Mongoose ObjectId.
 * Handles MongoDB user documents, raw ObjectId strings, and maps arbitrary Firebase UIDs deterministically.
 */
export function getAuthenticatedUserId(req) {
  if (req.user?._id) {
    if (mongoose.Types.ObjectId.isValid(req.user._id)) {
      return new mongoose.Types.ObjectId(req.user._id);
    }
  }
  if (req.user?.id) {
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      return new mongoose.Types.ObjectId(req.user.id);
    }
  }
  const fallbackStr = req.user?.uid || req.user?.id || req.user?._id;
  if (fallbackStr) {
    const hex = crypto.createHash('md5').update(String(fallbackStr)).digest('hex').substring(0, 24);
    return new mongoose.Types.ObjectId(hex);
  }
  return null;
}

/**
 * Normalize travel style to Capitalized form: Relaxed, Balanced, Packed
 */
function normalizeStyle(style) {
  if (!style) return 'Balanced';
  const s = style.toString().trim().toLowerCase();
  if (s === 'relaxed') return 'Relaxed';
  if (s === 'packed') return 'Packed';
  return 'Balanced';
}

/**
 * POST /api/trips
 * Creates and persists a new trip with preferences and full itinerary in MongoDB.
 */
export const createTrip = async (req, res, next) => {
  try {
    const { destination, duration, budget, interests, travelStyle, itinerary } = req.body;

    // Validation: Destination
    if (!destination || typeof destination !== 'object' || !destination.id || !destination.name) {
      return res.status(400).json({
        success: false,
        message: 'A valid destination object with id and name is required.'
      });
    }

    // Validation: Duration
    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum < 1 || durNum > 60) {
      return res.status(400).json({
        success: false,
        message: 'Trip duration must be a number between 1 and 60 days.'
      });
    }

    // Validation: Budget
    const budNum = parseInt(budget, 10);
    if (isNaN(budNum) || budNum < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Trip budget must be at least ₹1,000.'
      });
    }

    const normalizedTravelStyle = normalizeStyle(travelStyle);
    const validInterests = Array.isArray(interests) ? interests : [];

    // Ensure authentic destination hero image is resolved
    if (!destination.image || isGenericOrStockImage(destination.image)) {
      try {
        const hero = await getDestinationHeroImage(destination);
        if (hero?.url) {
          destination.image = hero.url;
          destination.imageAttribution = hero.attribution;
        }
      } catch {}
    }

    // Generate or format itinerary
    let finalItinerary = itinerary;
    if (!finalItinerary || !Array.isArray(finalItinerary.days) || finalItinerary.days.length === 0) {
      finalItinerary = await generateItineraryWithLiveRouting({
        destination,
        duration: durNum,
        budget: budNum,
        travelStyle: normalizedTravelStyle,
        interests: validInterests
      });
    }

    // Associate authenticated user (strictly required)
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to create and save trips to your account.'
      });
    }

    const tripData = {
      user: userId,
      destination: {
        id: destination.id.trim(),
        name: destination.name.trim(),
        country: destination.country?.trim() || '',
        countryCode: destination.countryCode?.trim() || '',
        latitude: typeof destination.latitude === 'number' ? destination.latitude : null,
        longitude: typeof destination.longitude === 'number' ? destination.longitude : null,
        image: destination.image || '',
        imageAttribution: destination.imageAttribution || '',
        defaultDur: destination.defaultDur || durNum,
        defaultBud: destination.defaultBud || budNum
      },
      duration: durNum,
      budget: budNum,
      interests: validInterests,
      travelStyle: normalizedTravelStyle,
      itinerary: finalItinerary
    };

    try {
      const newTrip = await Trip.create(tripData);

      return res.status(201).json({
        success: true,
        message: 'Trip created and saved successfully.',
        data: newTrip
      });
    } catch (createErr) {
      if (
        mongoose.connection.readyState !== 1 ||
        createErr.name === 'MongooseError' ||
        createErr.message.includes('buffering timed out') ||
        createErr.message.includes('Could not connect')
      ) {
        const fallbackTrip = {
          _id: 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
          ...tripData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOfflineFallback: true
        };
        return res.status(201).json({
          success: true,
          message: 'Trip saved to local session (Database currently offline).',
          data: fallbackTrip
        });
      }
      throw createErr;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/trips
 * Retrieves all trips belonging to the authenticated user.
 */
export const getUserTrips = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view your saved trips.'
      });
    }

    const trips = await Trip.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/trips/:id
 * Retrieves a specific trip by its MongoDB ObjectId.
 * Enforces strict user ownership verification.
 */
export const getTripById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID format.'
      });
    }

    let trip = null;
    try {
      trip = await Trip.findById(id);
    } catch (findErr) {
      if (
        findErr.message?.includes('buffering timed out') ||
        findErr.message?.includes('Could not connect')
      ) {
        return res.status(200).json({
          success: true,
          message: 'Trip updated in local session (Database offline).',
          data: { _id: id, ...req.body, updatedAt: new Date().toISOString(), isOfflineFallback: true }
        });
      }
      throw findErr;
    }

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    // Security Check: Verify request user is the owner
    const reqUserId = getAuthenticatedUserId(req)?.toString();
    const tripUserId = trip.user?.toString();

    if (!tripUserId || !reqUserId || reqUserId !== tripUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this trip.'
      });
    }

    return res.status(200).json({
      success: true,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/trips/:id
 * Updates trip preferences and regenerates/updates itinerary.
 * Enforces ownership verification.
 */
export const updateTrip = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID format.'
      });
    }

    const trip = await Trip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    // Security check: Only the owner can update
    const reqUserId = getAuthenticatedUserId(req)?.toString();
    const tripUserId = trip.user?.toString();

    if (!tripUserId || !reqUserId || reqUserId !== tripUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to update this trip.'
      });
    }

    const { destination, duration, budget, interests, travelStyle, itinerary } = req.body;

    let needsRegeneration = false;

    if (duration !== undefined) {
      const durNum = parseInt(duration, 10);
      if (isNaN(durNum) || durNum < 1 || durNum > 60) {
        return res.status(400).json({
          success: false,
          message: 'Duration must be between 1 and 60 days.'
        });
      }
      if (trip.duration !== durNum) {
        trip.duration = durNum;
        needsRegeneration = true;
      }
    }

    if (budget !== undefined) {
      const budNum = parseInt(budget, 10);
      if (isNaN(budNum) || budNum < 1000) {
        return res.status(400).json({
          success: false,
          message: 'Budget must be at least ₹1,000.'
        });
      }
      trip.budget = budNum;
    }

    if (travelStyle !== undefined) {
      const normStyle = normalizeStyle(travelStyle);
      if (trip.travelStyle !== normStyle) {
        trip.travelStyle = normStyle;
        needsRegeneration = true;
      }
    }

    if (interests !== undefined && Array.isArray(interests)) {
      trip.interests = interests;
      needsRegeneration = true;
    }

    if (destination !== undefined && typeof destination === 'object') {
      trip.destination = {
        id: destination.id || trip.destination.id,
        name: destination.name || trip.destination.name,
        country: destination.country !== undefined ? destination.country : trip.destination.country,
        countryCode: destination.countryCode !== undefined ? destination.countryCode : trip.destination.countryCode,
        latitude: typeof destination.latitude === 'number' ? destination.latitude : trip.destination.latitude,
        longitude: typeof destination.longitude === 'number' ? destination.longitude : trip.destination.longitude,
        image: destination.image || trip.destination.image,
        imageAttribution: destination.imageAttribution || trip.destination.imageAttribution,
        defaultDur: destination.defaultDur || trip.destination.defaultDur,
        defaultBud: destination.defaultBud || trip.destination.defaultBud
      };
      needsRegeneration = true;
    }

    // If explicit itinerary was passed in update body, validate and recalculate routing & feasibility
    if (itinerary && Array.isArray(itinerary.days) && itinerary.days.length > 0) {
      trip.itinerary = await recalculateItinerary({
        destination: trip.destination,
        travelStyle: trip.travelStyle,
        itinerary
      });
    } else if (needsRegeneration) {
      // Regenerate updated itinerary
      trip.itinerary = await generateItineraryWithLiveRouting({
        destination: trip.destination,
        duration: trip.duration,
        budget: trip.budget,
        travelStyle: trip.travelStyle,
        interests: trip.interests
      });
    }

    await trip.save();

    return res.status(200).json({
      success: true,
      message: 'Trip updated successfully.',
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/trips/:id
 * Removes a trip by ID.
 * Enforces strict user ownership verification.
 */
export const deleteTrip = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID format.'
      });
    }

    const trip = await Trip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    const reqUserId = getAuthenticatedUserId(req)?.toString();
    const tripUserId = trip.user?.toString();

    if (!tripUserId || !reqUserId || reqUserId !== tripUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to delete this trip.'
      });
    }

    await Trip.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Trip deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};


/**
 * POST /api/trips/preview
 * Public endpoint: Generates an intelligent, personalized itinerary preview
 * without requiring authentication or persisting to MongoDB.
 */
export const previewTrip = async (req, res, next) => {
  try {
    const { destination, duration, budget, interests, travelStyle } = req.body;

    // Validation: Destination
    if (!destination || typeof destination !== 'object' || !destination.name) {
      return res.status(400).json({
        success: false,
        message: 'A valid destination object with name is required.'
      });
    }

    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum < 1 || durNum > 60) {
      return res.status(400).json({
        success: false,
        message: 'Trip duration must be a number between 1 and 60 days.'
      });
    }

    const budNum = parseInt(budget, 10);
    if (isNaN(budNum) || budNum < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Trip budget must be at least ₹1,000.'
      });
    }

    const normalizedTravelStyle = normalizeStyle(travelStyle);
    const validInterests = Array.isArray(interests) ? interests.map(i => String(i).trim()) : [];

    // Ensure authentic destination hero image is resolved
    if (!destination.image || isGenericOrStockImage(destination.image)) {
      try {
        const hero = await getDestinationHeroImage(destination);
        if (hero?.url) {
          destination.image = hero.url;
          destination.imageAttribution = hero.attribution;
        }
      } catch {}
    }

    const generatedItinerary = await generateItineraryWithLiveRouting({
      destination,
      duration: durNum,
      budget: budNum,
      travelStyle: normalizedTravelStyle,
      interests: validInterests
    });

    const previewData = {
      destination: {
        id: (destination.id || destination.name).toLowerCase().trim(),
        name: destination.name.trim(),
        country: destination.country?.trim() || '',
        countryCode: destination.countryCode?.trim() || '',
        latitude: typeof destination.latitude === 'number' ? destination.latitude : null,
        longitude: typeof destination.longitude === 'number' ? destination.longitude : null,
        image: destination.image || '',
        imageAttribution: destination.imageAttribution || ''
      },
      duration: durNum,
      budget: budNum,
      interests: validInterests,
      travelStyle: normalizedTravelStyle,
      itinerary: generatedItinerary,
      isGuestPreview: true
    };

    return res.status(200).json({
      success: true,
      message: 'Itinerary preview generated successfully.',
      data: previewData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/trips/recalculate
 * Recalculates routes, legs, and day feasibility for an edited itinerary.
 * Accessible by both guests and authenticated users.
 */
export const recalculateTripItinerary = async (req, res, next) => {
  try {
    const { itinerary, travelStyle, destination } = req.body;
    if (!itinerary || !Array.isArray(itinerary.days)) {
      return res.status(400).json({
        success: false,
        message: 'A valid itinerary object with days array is required.'
      });
    }

    const recalculated = await recalculateItinerary({
      destination,
      travelStyle: travelStyle || 'Balanced',
      itinerary
    });

    return res.status(200).json({
      success: true,
      message: 'Itinerary recalculated successfully.',
      data: recalculated
    });
  } catch (err) {
    next(err);
  }
};
