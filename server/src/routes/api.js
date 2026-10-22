import express from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import tripRoutes from './tripRoutes.js';
import savedDestinationRoutes from './savedDestinationRoutes.js';

const router = express.Router();

// Health check endpoint mounted at /api/health
router.use('/health', healthRoutes);

// Authentication & profile endpoints mounted at /api/auth
router.use('/auth', authRoutes);

// Trip & Itinerary endpoints mounted at /api/trips
router.use('/trips', tripRoutes);

// Saved destination endpoints mounted at /api/destinations
router.use('/destinations', savedDestinationRoutes);

export default router;
