import express from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import tripRoutes from './tripRoutes.js';
import destinationRoutes from './destinationRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import routingRoutes from './routingRoutes.js';

const router = express.Router();

// Health check endpoint mounted at /api/health
router.use('/health', healthRoutes);

// Authentication & profile endpoints mounted at /api/auth
router.use('/auth', authRoutes);

// Trip & Itinerary endpoints mounted at /api/trips
router.use('/trips', tripRoutes);

// Destination search, places discovery, and saved destinations at /api/destinations
router.use('/destinations', destinationRoutes);

// Live weather endpoints mounted at /api/weather
router.use('/weather', weatherRoutes);

// Real-world road network and geodesic routing endpoints mounted at /api/routing
router.use('/routing', routingRoutes);

export default router;
