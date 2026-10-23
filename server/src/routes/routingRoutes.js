import express from 'express';
import { calculateRoute } from '../services/routingService.js';

const router = express.Router();

/**
 * POST /api/routing/calculate
 * Computes road network or geodesic routing between ordered waypoints
 * Body: { waypoints: Array<{ latitude: number, longitude: number, name?: string }>, mode?: 'driving'|'walking' }
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const { waypoints, mode = 'driving' } = req.body;

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two waypoints with valid latitude and longitude are required to calculate a route.'
      });
    }

    const result = await calculateRoute(waypoints, mode);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      data: result.route
    });
  } catch (err) {
    next(err);
  }
});

export default router;
