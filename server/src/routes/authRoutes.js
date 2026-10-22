import express from 'express';
import { getMe, createOrSyncProfile, updateProfile } from '../controllers/authController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/auth/me
 * @desc    Get or initialize the authenticated user's MongoDB profile
 * @access  Private (Firebase Bearer Token required)
 */
router.get('/me', verifyAuth, getMe);

/**
 * @route   POST /api/auth/profile
 * @desc    Initialize or synchronize user profile in MongoDB
 * @access  Private (Firebase Bearer Token required)
 */
router.post('/profile', verifyAuth, createOrSyncProfile);

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update permitted profile fields (name, travelStyle, phoneNumber)
 * @access  Private (Firebase Bearer Token required)
 */
router.patch('/profile', verifyAuth, updateProfile);

export default router;
