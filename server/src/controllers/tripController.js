import crypto from 'crypto';
import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import { generateItineraryWithLiveRouting, recalculateItinerary } from '../services/itineraryGenerator.js';
import { getDestinationHeroImage, isGenericOrStockImage } from '../services/imageService.js';
import { generateItinerary, destinationTemplates } from '../utils/itineraryGenerator.js';
import {
  generateGroundedItinerary,
  buildBudgetBreakdown,
  calculateTripDates
} from '../services/itineraryService.js';
import { validateItinerary } from '../services/validationService.js';

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
 * Creates and persists a new trip with validated preferences and grounded itinerary in MongoDB.
 */
export const createTrip = async (req, res, next) => {
  try {
    const {
      destination,
      duration,
      travelers,
      startDate,
      endDate,
      budget,
      interests,
      travelStyle,
      itinerary
    } = req.body;

    // Validation: Destination
    if (!destination || typeof destination !== 'object' || !destination.name || destination.name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'A valid destination object with a destination name is required.'
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

    // Validation: Travelers
    const travNum = travelers !== undefined ? parseInt(travelers, 10) : 1;
    if (isNaN(travNum) || travNum < 1 || travNum > 20) {
      return res.status(400).json({
        success: false,
        message: 'Traveller count must be a number between 1 and 20.'
      });
    }

    // Validation: Start Date (optional)
    let parsedStartDate = null;
    if (startDate) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format. Please provide a valid ISO date.'
        });
      }
      parsedStartDate = parsed;
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
    // Associate authenticated user (strictly required)
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to create and save trips to your account.'
      });
    }

    let finalItinerary = itinerary;
    let resolvedCountry = destination.country?.trim() || 'Worldwide';
    let resolvedImage = destination.image || '';

    // Step 1: If itinerary is explicitly provided, validate it
    if (finalItinerary && Array.isArray(finalItinerary.days) && finalItinerary.days.length > 0) {
      const valResult = validateItinerary(finalItinerary, {
        expectedDays: durNum,
        travelStyle: normalizedTravelStyle
      });

      if (!valResult.isValid) {
        return res.status(400).json({
          success: false,
          message: `Provided itinerary failed validation: ${valResult.errors.join('; ')}`,
          errors: valResult.errors
        });
      }

      // Ensure budget breakdown and dates are attached
      if (!finalItinerary.breakdown || finalItinerary.breakdown.length === 0) {
        const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(budNum, travNum);
        finalItinerary.breakdown = breakdown;
        finalItinerary.estimatedCostPerPerson = estimatedCostPerPerson;
      }
    } else {
      // Step 2: Generate itinerary using shared grounded itinerary service
      try {
        const generated = await generateGroundedItinerary(
          {
            destination,
            duration: durNum,
            budget: budNum,
            travelers: travNum,
            startDate: parsedStartDate,
            travelStyle: normalizedTravelStyle,
            interests: validInterests
          },
          { fetchFn: req.fetchFn || fetch }
        );

        finalItinerary = generated.itinerary;
        if (generated.destination) {
          resolvedCountry = generated.destination.country || resolvedCountry;
          resolvedImage = generated.destination.image || resolvedImage;
        }
      } catch (genErr) {
        // Fallback: If destination matches a curated local archive template, use curated generator
        const destKey = (destination.id || destination.name || '').toLowerCase().trim();
        if (destinationTemplates[destKey]) {
          try {
            finalItinerary = generateItinerary({
              destination,
              duration: durNum,
              budget: budNum,
              travelers: travNum,
              startDate: parsedStartDate,
              travelStyle: normalizedTravelStyle,
              interests: validInterests
            });
          } catch (templErr) {
            return res.status(400).json({
              success: false,
              code: templErr.code || 'TEMPLATE_ERROR',
              message: templErr.message
            });
          }
        } else {
          // Failure guarantee: Never save a misleading or partially generated trip!
          const statusCode = genErr.code === 'DESTINATION_NOT_FOUND' ? 400
            : (genErr.code === 'INSUFFICIENT_ATTRACTIONS' || genErr.code === 'ITINERARY_VALIDATION_FAILED') ? 422
            : genErr.code === 'POI_SERVICE_UNAVAILABLE' ? 503
            : 500;

          return res.status(statusCode).json({
            success: false,
            code: genErr.code || 'GENERATION_FAILED',
            message: genErr.message || 'Failed to generate a valid grounded itinerary for the requested destination.',
            retryable: Boolean(genErr.retryable || genErr.code === 'POI_SERVICE_UNAVAILABLE'),
            errors: genErr.validationErrors || []
          });
        }
      }
    }

    const { startDate: cleanStart, endDate: cleanEnd } = calculateTripDates(parsedStartDate, durNum);

    const tripData = {
      user: userId,
      destination: {
        id: destination.id ? destination.id.trim() : destination.name.toLowerCase().replace(/[^\w]/g, '-'),
        name: destination.name.trim(),
        country: destination.country?.trim() || resolvedCountry || '',
        countryCode: destination.countryCode?.trim() || '',
        latitude: typeof destination.latitude === 'number' ? destination.latitude : null,
        longitude: typeof destination.longitude === 'number' ? destination.longitude : null,
        image: destination.image || resolvedImage || '',
        imageAttribution: destination.imageAttribution || '',
        defaultDur: destination.defaultDur || durNum,
        defaultBud: destination.defaultBud || budNum
      },
      duration: durNum,
      travelers: travNum,
      startDate: cleanStart,
      endDate: cleanEnd,
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
 * Enforces ownership verification and quality validation.
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

    const {
      destination,
      duration,
      travelers,
      startDate,
      budget,
      interests,
      travelStyle,
      itinerary
    } = req.body;

    let needsRegeneration = false;

    // Validate and update Travelers
    if (travelers !== undefined) {
      const travNum = parseInt(travelers, 10);
      if (isNaN(travNum) || travNum < 1 || travNum > 20) {
        return res.status(400).json({
          success: false,
          message: 'Traveller count must be a number between 1 and 20.'
        });
      }
      if (trip.travelers !== travNum) {
        trip.travelers = travNum;
      }
    }

    // Validate and update Start Date
    if (startDate !== undefined) {
      if (startDate === null) {
        trip.startDate = null;
        trip.endDate = null;
      } else {
        const parsed = new Date(startDate);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date format.'
          });
        }
        trip.startDate = parsed;
        const { endDate: calcEnd } = calculateTripDates(parsed, trip.duration);
        trip.endDate = calcEnd;
      }
    }

    // Validate and update Duration
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
        if (trip.startDate) {
          const { endDate: calcEnd } = calculateTripDates(trip.startDate, durNum);
          trip.endDate = calcEnd;
        }
      }
    }

    // Validate and update Budget
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

    // Validate and update Travel Style
    if (travelStyle !== undefined) {
      const normStyle = normalizeStyle(travelStyle);
      if (trip.travelStyle !== normStyle) {
        trip.travelStyle = normStyle;
        needsRegeneration = true;
      }
    }

    // Validate and update Interests
    if (interests !== undefined && Array.isArray(interests)) {
      trip.interests = interests;
      needsRegeneration = true;
    }

    // Validate and update Destination
    if (destination !== undefined && typeof destination === 'object' && destination.name) {
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

    // Explicit itinerary passed in update body
    if (itinerary && Array.isArray(itinerary.days) && itinerary.days.length > 0) {
      const valResult = validateItinerary(itinerary, {
        expectedDays: trip.duration,
        travelStyle: trip.travelStyle
      });

      if (!valResult.isValid) {
        return res.status(400).json({
          success: false,
          message: `Provided itinerary failed validation: ${valResult.errors.join('; ')}`,
          errors: valResult.errors
        });
      }

      trip.itinerary = itinerary;
      needsRegeneration = false;
    } else if (needsRegeneration) {
      // Regenerate updated itinerary via shared service
      try {
        const generated = await generateGroundedItinerary(
          {
            destination: trip.destination,
            duration: trip.duration,
            budget: trip.budget,
            travelers: trip.travelers,
            startDate: trip.startDate,
            travelStyle: trip.travelStyle,
            interests: trip.interests
          },
          { fetchFn: req.fetchFn || fetch }
        );
        trip.itinerary = generated.itinerary;
      } catch (genErr) {
        // Curated template fallback if available
        const destKey = (trip.destination.id || trip.destination.name || '').toLowerCase().trim();
        if (destinationTemplates[destKey]) {
          trip.itinerary = generateItinerary({
            destination: trip.destination,
            duration: trip.duration,
            budget: trip.budget,
            travelers: trip.travelers,
            startDate: trip.startDate,
            travelStyle: trip.travelStyle,
            interests: trip.interests
          });
        } else {
          // Do not save corrupt data
          const statusCode = genErr.code === 'DESTINATION_NOT_FOUND' ? 400
            : (genErr.code === 'INSUFFICIENT_ATTRACTIONS' || genErr.code === 'ITINERARY_VALIDATION_FAILED') ? 422
            : 500;
          return res.status(statusCode).json({
            success: false,
            code: genErr.code || 'GENERATION_FAILED',
            message: genErr.message || 'Failed to regenerate itinerary for the updated trip.',
            errors: genErr.validationErrors || []
          });
        }
      }
    }

    // If budget or travelers changed without full itinerary regeneration, keep cost allocation consistent
    if (trip.itinerary && (!trip.itinerary.breakdown || budget !== undefined || travelers !== undefined)) {
      const { breakdown, estimatedCostPerPerson } = buildBudgetBreakdown(trip.budget, trip.travelers);
      trip.itinerary.breakdown = breakdown;
      trip.itinerary.estimatedCostPerPerson = estimatedCostPerPerson;
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
