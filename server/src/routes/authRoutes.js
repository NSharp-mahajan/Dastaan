import express from 'express';
import { getMe, createOrSyncProfile, updateProfile, signup, login } from '../controllers/authController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/auth/me or GET /api/auth/profile
 * @desc    Get or initialize the authenticated user's MongoDB profile
 * @access  Private (Firebase Bearer Token required)
 */
router.get('/me', verifyAuth, getMe);
router.get('/profile', verifyAuth, getMe);

/**
 * @route   POST /api/auth/profile
 * @desc    Initialize or synchronize user profile in MongoDB
 * @access  Private (Firebase Bearer Token required)
 */
router.post('/profile', verifyAuth, createOrSyncProfile);

/**
 * @route   PATCH /api/auth/profile or PUT /api/auth/profile
 * @desc    Update permitted profile fields (name, travelStyle, phoneNumber)
 * @access  Private (Firebase Bearer Token required)
 */
router.patch('/profile', verifyAuth, updateProfile);
router.put('/profile', verifyAuth, updateProfile);

// Backward-compatibility endpoints
router.post('/signup', signup);
router.post('/register', signup);
router.post('/login', login);

export default router;
