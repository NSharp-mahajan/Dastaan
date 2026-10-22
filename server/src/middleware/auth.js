import { auth, hasServiceAccountCredential } from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Authentication middleware that verifies the Firebase ID token in the Authorization header.
 * Attaches verified user identity from token claims to req.user,
 * and attaches existing MongoDB profile to req.mongoUser and req.userId.
 */
export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Access denied. Authorization Bearer token is missing or malformed.'
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_EMPTY_TOKEN',
      message: 'Access denied. Provided Bearer token is empty.'
    });
  }

  try {
    // Perform revocation check only when an explicit service account credential is configured.
    // In Public Certificate mode, verifyIdToken(token, false) cryptographically verifies
    // signature, issuer, audience, and expiry without triggering GCE metadata server lookup.
    const checkRevocation = Boolean(hasServiceAccountCredential);
    const decodedToken = await auth.verifyIdToken(token, checkRevocation);

    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token: missing user identifier.'
      });
    }

    // Attach verified identity strictly from token claims
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: Boolean(decodedToken.email_verified),
      name: decodedToken.name || '',
      picture: decodedToken.picture || null,
      claims: decodedToken
    };

    // Attach MongoDB profile references for coordination with Trips & Saved Destinations
    try {
      const mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });
      if (mongoUser) {
        req.mongoUser = mongoUser;
        req.userId = mongoUser._id;
      } else {
        req.mongoUser = null;
        req.userId = null;
      }
    } catch (dbErr) {
      console.warn('[Auth Middleware] Non-fatal DB lookup warning:', dbErr.message);
      req.mongoUser = null;
      req.userId = null;
    }

    next();
  } catch (err) {
    console.warn(`[Auth Middleware] Verification rejected: ${err.code || 'INVALID_TOKEN'} (${err.message})`);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please sign in again.'
      });
    }

    if (err.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Authentication token has been revoked. Please sign in again.'
      });
    }

    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Authentication failed: ' + (err.message || 'Invalid token')
    });
  }
};

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
  if (!token) {
    req.user = null;
    req.mongoUser = null;
    req.userId = null;
    return next();
  }

  try {
    const checkRevocation = Boolean(hasServiceAccountCredential);
    const decodedToken = await auth.verifyIdToken(token, checkRevocation);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: Boolean(decodedToken.email_verified),
      name: decodedToken.name || '',
      picture: decodedToken.picture || null,
      claims: decodedToken
    };

    const mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });
    if (mongoUser) {
      req.mongoUser = mongoUser;
      req.userId = mongoUser._id;
    } else {
      req.mongoUser = null;
      req.userId = null;
    }
  } catch {
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
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required for administrative actions.'
    });
  }

  try {
    const role = req.mongoUser?.role || (await User.findOne({ firebaseUid: req.user.uid }).select('role'))?.role;
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
