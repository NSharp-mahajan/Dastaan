import express from 'express';
import healthRoutes from './healthRoutes.js';

const router = express.Router();

// Health check endpoint mounted at /api/health
router.use('/health', healthRoutes);

export default router;
