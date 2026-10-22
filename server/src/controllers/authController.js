import User from '../models/User.js';

const VALID_TRAVEL_STYLES = ['RELAXED', 'BALANCED', 'PACKED', 'Relaxed', 'Balanced', 'Packed'];

/**
 * GET /api/auth/me
 * Retrieves or initializes the MongoDB user profile for the verified Firebase user.
 */
export const getMe = async (req, res) => {
  const { uid, email, name: tokenName, picture, emailVerified } = req.user;

  try {
    let user = req.mongoUser;

    if (!user) {
      // 1. Look up profile by firebaseUid
      user = await User.findOne({ firebaseUid: uid });
    }

    if (!user && email) {
      // 2. Check if user exists by email (legacy migration)
      user = await User.findOne({ email });
      if (user) {
        user.firebaseUid = uid;
        user.emailVerified = Boolean(emailVerified);
        if (picture && !user.photoURL) user.photoURL = picture;
        await user.save();
      }
    }

    // 3. If still not found, atomically initialize the profile
    if (!user) {
      const defaultName = tokenName || (email ? email.split('@')[0] : 'Traveler');
      user = await User.findOneAndUpdate(
        { firebaseUid: uid },
        {
          $setOnInsert: {
            firebaseUid: uid,
            email: email || `${uid}@placeholder.dastaan.local`,
            name: defaultName,
            photoURL: picture || null,
            role: 'user',
            travelStyle: 'Balanced',
            emailVerified: Boolean(emailVerified)
          }
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );
    } else if (user.emailVerified !== Boolean(emailVerified)) {
      // Keep email verification status synchronized with Firebase claims
      user.emailVerified = Boolean(emailVerified);
      await user.save();
    }

    // Attach latest references for any downstream handlers
    req.mongoUser = user;
    req.userId = user._id;

    return res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    console.error('[Auth Controller] Error in getMe:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile: ' + err.message
    });
  }
};

/**
 * POST /api/auth/profile
 * Initializes or syncs a MongoDB profile with client-provided initial details (e.g., travel style, mobile)
 * Uses verified Firebase UID to ensure secure mapping.
 */
export const createOrSyncProfile = async (req, res) => {
  const { uid, email, name: tokenName, picture, emailVerified } = req.user;
  const { name, travelStyle, mobile, phoneNumber, photoURL } = req.body;

  try {
    const setFields = {
      emailVerified: Boolean(emailVerified)
    };

    const setOnInsertFields = {
      firebaseUid: uid,
      email: email || `${uid}@placeholder.dastaan.local`,
      role: 'user' // Strictly defaulted; client cannot elevate role
    };

    // Sanitize and validate permitted initial updates without field overlap
    if (name && typeof name === 'string' && name.trim()) {
      setFields.name = name.trim().slice(0, 100);
    } else {
      setOnInsertFields.name = tokenName || (email ? email.split('@')[0] : 'Traveler');
    }

    if (travelStyle && VALID_TRAVEL_STYLES.includes(travelStyle)) {
      setFields.travelStyle = travelStyle;
    } else {
      setOnInsertFields.travelStyle = 'Balanced';
    }

    const contactNumber = (phoneNumber || mobile || '').trim();
    if (contactNumber) {
      setFields.phoneNumber = contactNumber;
      setFields.mobile = contactNumber;
    }

    const photo = photoURL || picture;
    if (photo && typeof photo === 'string') {
      setFields.photoURL = photo.trim();
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: setFields,
        $setOnInsert: setOnInsertFields
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    req.mongoUser = user;
    req.userId = user._id;

    return res.status(200).json({
      success: true,
      message: 'Profile synchronized successfully',
      user
    });
  } catch (err) {
    console.error('[Auth Controller] Error in createOrSyncProfile:', err.message);
    if (err.code === 11000) {
      // Duplicate key error handling
      return res.status(409).json({
        success: false,
        message: 'A profile with this email or UID already exists'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize profile: ' + err.message
    });
  }
};

/**
 * PATCH /api/auth/profile
 * Updates permitted profile fields only.
 * Disallows client modification of role, email, firebaseUid, or ID.
 */
export const updateProfile = async (req, res) => {
  const { uid } = req.user;
  const { name, travelStyle, phoneNumber, mobile, photoURL } = req.body;

  try {
    const updateDoc = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
      }
      updateDoc.name = name.trim().slice(0, 100);
    }

    if (travelStyle !== undefined) {
      if (!VALID_TRAVEL_STYLES.includes(travelStyle)) {
        return res.status(400).json({
          success: false,
          message: `Invalid travel style. Permitted styles: ${VALID_TRAVEL_STYLES.join(', ')}`
        });
      }
      updateDoc.travelStyle = travelStyle;
    }

    if (phoneNumber !== undefined || mobile !== undefined) {
      const cleanPhone = (phoneNumber || mobile || '').trim();
      updateDoc.phoneNumber = cleanPhone;
      updateDoc.mobile = cleanPhone;
    }

    if (photoURL !== undefined) {
      updateDoc.photoURL = photoURL ? String(photoURL).trim() : null;
    }

    if (Object.keys(updateDoc).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid permitted profile fields provided to update'
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: updateDoc },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    req.mongoUser = updatedUser;
    req.userId = updatedUser._id;

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('[Auth Controller] Error in updateProfile:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + err.message
    });
  }
};
