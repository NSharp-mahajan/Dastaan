import express from 'express';
import { getWeatherHandler } from '../controllers/travelDataController.js';

const router = express.Router();

/**
 * @route   GET /api/weather
 * @desc    Get current weather & 7-day forecast for coordinates or destination
 * @access  Public
 */
router.get('/', getWeatherHandler);

export default router;
