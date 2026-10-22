import express from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

// Health check endpoint mounted at /api/health
router.use('/health', healthRoutes);

// Authentication & profile endpoints mounted at /api/auth
router.use('/auth', authRoutes);

export default router;
