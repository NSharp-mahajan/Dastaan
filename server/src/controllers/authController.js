import User from '../models/User.js';
import { signToken, hashPassword, comparePassword } from '../utils/token.js';

const VALID_TRAVEL_STYLES = ['RELAXED', 'BALANCED', 'PACKED', 'Relaxed', 'Balanced', 'Packed'];

/**
 * GET /api/auth/me
 * Retrieves or initializes the MongoDB user profile for the verified Firebase user.
 */
export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const { uid, email, name: tokenName, picture, emailVerified } = req.user;

  try {
    let user = req.mongoUser;

    if (!user && uid) {
      // 1. Look up profile by firebaseUid
      user = await User.findOne({ firebaseUid: uid });
    }

    if (!user && email) {
      // 2. Check if user exists by email (legacy migration)
      user = await User.findOne({ email });
      if (user && uid) {
        user.firebaseUid = uid;
        user.emailVerified = Boolean(emailVerified);
        if (picture && !user.photoURL) user.photoURL = picture;
        await user.save();
      }
    }

    // 3. If still not found and we have a verified Firebase UID, atomically initialize the profile
    if (!user && uid) {
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
    } else if (user && emailVerified !== undefined && user.emailVerified !== Boolean(emailVerified)) {
      // Keep email verification status synchronized with Firebase claims
      user.emailVerified = Boolean(emailVerified);
      await user.save();
    }

    // If request was from local mock user (developer tests)
    if (!user && req.user._id) {
      user = req.user;
    }

    // Attach latest references for downstream handlers
    if (user && user._id) {
      req.mongoUser = user;
      req.userId = user._id;
    }

    return res.status(200).json({
      success: true,
      user,
      data: user
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
      user,
      data: user
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
      user: updatedUser,
      data: updatedUser
    });
  } catch (err) {
    console.error('[Auth Controller] Error in updateProfile:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + err.message
    });
  }
};

/**
 * Backward-compatible signup handler for legacy developer tests
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, passwordHash, mobile, travelStyle } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Determine password hash
    let finalHash = passwordHash;
    if (!finalHash) {
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
      finalHash = hashPassword(password);
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      firebaseUid: 'legacy_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      mobile: mobile?.trim() || '',
      passwordHash: finalHash,
      travelStyle: travelStyle || 'Balanced'
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        travelStyle: user.travelStyle
      },
      token
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Backward-compatible login handler for legacy developer tests
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const identifier = email.trim().toLowerCase();

    // Match by email or mobile
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with those credentials.' });
    }

    // Support both direct password and SHA-256 pre-hashed password
    const isDirectMatch = user.passwordHash === password;
    const isHashedMatch = user.passwordHash ? comparePassword(password, user.passwordHash) : false;

    if (!isDirectMatch && !isHashedMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        travelStyle: user.travelStyle
      },
      token
    });
  } catch (err) {
    next(err);
  }
};
