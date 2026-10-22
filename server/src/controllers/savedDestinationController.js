import SavedDestination from '../models/SavedDestination.js';

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

/** GET /api/destinations/saved */
export const getSavedDestinations = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to view saved destinations.' });
    }

    const destinations = await SavedDestination.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/destinations/save */
export const saveDestination = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to save destinations.' });
    }

    const { destinationId, destinationName, country } = req.body || {};
    if (typeof destinationId !== 'string' || !destinationId.trim()) {
      return res.status(400).json({ success: false, message: 'A destinationId is required.' });
    }

    const savedDestination = await SavedDestination.create({
      user: userId,
      destinationId: destinationId.trim(),
      ...(typeof destinationName === 'string' && destinationName.trim() ? { destinationName: destinationName.trim() } : {}),
      ...(typeof country === 'string' && country.trim() ? { country: country.trim() } : {})
    });

    return res.status(201).json({ success: true, message: 'Destination saved successfully.', data: savedDestination });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Destination is already saved.' });
    }
    return next(err);
  }
};

/** DELETE /api/destinations/:destinationId */
export const removeSavedDestination = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to remove saved destinations.' });
    }

    const destinationId = req.params.destinationId?.trim();
    if (!destinationId) {
      return res.status(400).json({ success: false, message: 'A destinationId is required.' });
    }

    const deleted = await SavedDestination.findOneAndDelete({ user: userId, destinationId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Saved destination not found.' });
    }

    return res.status(200).json({ success: true, message: 'Saved destination removed successfully.' });
  } catch (err) {
    return next(err);
  }
};
