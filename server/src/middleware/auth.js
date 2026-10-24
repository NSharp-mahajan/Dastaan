import crypto from 'crypto';
import mongoose from 'mongoose';
import { auth, hasServiceAccountCredential } from '../config/firebase.js';
import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';

/**
 * Authentication middleware that verifies the Firebase ID token in the Authorization header.
 * Attaches verified user identity to req.user, req.mongoUser, and req.userId.
 * Supports legacy mock/fallback tokens for existing developer tests.
 */
export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required. Please provide a valid Bearer token in the Authorization header.'
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      success: false,
      code: 'AUTH_EMPTY_TOKEN',
      message: 'Authentication required. Missing or empty Bearer token.'
    });
  }

  // 1. Primary: Verify Firebase ID Token
  try {
    const checkRevocation = Boolean(hasServiceAccountCredential);
    const decodedToken = await auth.verifyIdToken(token, checkRevocation);

    if (decodedToken && decodedToken.uid) {
      // Look up or initialize MongoDB profile
      let mongoUser = null;
      try {
        mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!mongoUser && decodedToken.email) {
          mongoUser = await User.findOne({ email: decodedToken.email });
          if (mongoUser) {
            mongoUser.firebaseUid = decodedToken.uid;
            mongoUser.emailVerified = Boolean(decodedToken.email_verified);
            if (decodedToken.picture && !mongoUser.photoURL) mongoUser.photoURL = decodedToken.picture;
            await mongoUser.save();
          }
        }

        if (!mongoUser) {
          const defaultName = decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Traveler');
          mongoUser = await User.findOneAndUpdate(
            { firebaseUid: decodedToken.uid },
            {
              $setOnInsert: {
                firebaseUid: decodedToken.uid,
                email: decodedToken.email || `${decodedToken.uid}@placeholder.dastaan.local`,
                name: defaultName,
                photoURL: decodedToken.picture || null,
                role: 'user',
                travelStyle: 'Balanced',
                emailVerified: Boolean(decodedToken.email_verified)
              }
            },
            {
              new: true,
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert: true
            }
          );
        }
      } catch (dbErr) {
        console.warn('[Auth Middleware] Non-fatal DB lookup warning:', dbErr.message);
      }

      const resolvedOid = (mongoUser?._id && mongoose.Types.ObjectId.isValid(mongoUser._id))
        ? mongoUser._id
        : new mongoose.Types.ObjectId(
            crypto.createHash('md5').update(decodedToken.uid).digest('hex').substring(0, 24)
          );

      req.user = {
        _id: resolvedOid,
        id: resolvedOid.toString(),
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        emailVerified: Boolean(decodedToken.email_verified),
        name: decodedToken.name || mongoUser?.name || '',
        picture: decodedToken.picture || mongoUser?.photoURL || null,
        claims: decodedToken
      };

      req.mongoUser = mongoUser;
      req.userId = resolvedOid;

      return next();
    }
  } catch (firebaseErr) {
    if (firebaseErr.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please sign in again.'
      });
    }

    if (firebaseErr.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Authentication token has been revoked. Please sign in again.'
      });
    }

    // 2. Fallback: Check local JWT token (used in developer unit tests like trip.test.js)
    try {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const idVal = decoded.id;
        const isValidOid = mongoose.Types.ObjectId.isValid(idVal);
        const objId = isValidOid ? new mongoose.Types.ObjectId(idVal) : null;

        let user = null;
        if (User.db?.readyState === 1 && isValidOid) {
          try {
            user = await User.findById(objId);
          } catch {
            // DB lookup failed or disconnected
          }
        }

        req.user = {
          _id: objId,
          id: idVal,
          email: decoded.email,
          name: decoded.name || user?.name || 'User'
        };
        req.mongoUser = user;
        req.userId = objId;

        return next();
      }
    } catch {
      // Fall through to error response
    }

    console.warn(`[Auth Middleware] Verification rejected: ${firebaseErr.code || 'INVALID_TOKEN'} (${firebaseErr.message})`);

    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Authentication failed: ' + (firebaseErr.message || 'Invalid token')
    });
  }
};

/**
 * Backward compatibility alias for tripRoutes and existing controller tests.
 */
export const authenticateUser = verifyAuth;

/**
 * Optional authentication middleware for routes accessible by both guests and authenticated users.
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.mongoUser = null;
    req.userId = null;
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token || token === 'null' || token === 'undefined') {
    req.user = null;
    req.mongoUser = null;
    req.userId = null;
    return next();
  }

  try {
    const checkRevocation = Boolean(hasServiceAccountCredential);
    const decodedToken = await auth.verifyIdToken(token, checkRevocation);
    const mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });

    const optOid = (mongoUser?._id && mongoose.Types.ObjectId.isValid(mongoUser._id))
      ? mongoUser._id
      : new mongoose.Types.ObjectId(
          crypto.createHash('md5').update(decodedToken.uid).digest('hex').substring(0, 24)
        );

    req.user = {
      _id: optOid,
      id: optOid.toString(),
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: Boolean(decodedToken.email_verified),
      name: decodedToken.name || mongoUser?.name || '',
      picture: decodedToken.picture || null,
      claims: decodedToken
    };
    req.mongoUser = mongoUser;
    req.userId = optOid;
  } catch {
    // Check fallback local token
    try {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const isValidOid = mongoose.Types.ObjectId.isValid(decoded.id);
        const objId = isValidOid ? new mongoose.Types.ObjectId(decoded.id) : null;
        req.user = {
          _id: objId,
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || 'User'
        };
        req.mongoUser = null;
        req.userId = objId;
        return next();
      }
    } catch {
      // Ignore
    }
    req.user = null;
    req.mongoUser = null;
    req.userId = null;
  }

  next();
};

/**
 * Role-based authorization middleware to restrict routes to administrators.
 */
export const requireAdmin = async (req, res, next) => {
  if (!req.user || (!req.user.uid && !req.user._id)) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required for administrative actions.'
    });
  }

  try {
    const query = req.user.uid ? { firebaseUid: req.user.uid } : { _id: req.user._id };
    const role = req.mongoUser?.role || (await User.findOne(query).select('role'))?.role;
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Forbidden. Administrator privileges required.'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying administrative privileges: ' + err.message
    });
  }
};
