import express from 'express';
import healthRoutes from './healthRoutes.js';
import tripRoutes from './tripRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

// Health check endpoint mounted at /api/health
router.use('/health', healthRoutes);

// Auth endpoints mounted at /api/auth
router.use('/auth', authRoutes);

// Trip & Itinerary endpoints mounted at /api/trips
router.use('/trips', tripRoutes);

export default router;
