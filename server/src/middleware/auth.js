import mongoose from 'mongoose';
import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Middleware: Strictly requires authentication.
 * Rejects requests without a valid Bearer token with 401 Unauthorized.
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid Bearer token in the Authorization header.'
      });
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or empty Bearer token.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid, malformed, or expired authentication token.'
      });
    }

    // Attempt to verify user existence in MongoDB if DB is connected
    try {
      if (User.db?.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch {
      // Fall through to ObjectId check
    }

    if (mongoose.Types.ObjectId.isValid(decoded.id)) {
      req.user = {
        _id: new mongoose.Types.ObjectId(decoded.id),
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || 'User'
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid user session. Please log in again.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: err.message
    });
  }
}

/**
 * Middleware: Optional authentication.
 * If a valid Bearer token is provided, populates req.user with a verified user.
 * If no token is provided, sets req.user to null and allows request to proceed.
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token || token === 'null' || token === 'undefined') {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      req.user = null;
      return next();
    }

    try {
      if (User.db?.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch {
      // Fall through
    }

    if (mongoose.Types.ObjectId.isValid(decoded.id)) {
      req.user = {
        _id: new mongoose.Types.ObjectId(decoded.id),
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || 'User'
      };
      return next();
    }

    req.user = null;
    next();
  } catch {
    req.user = null;
    next();
  }
}
