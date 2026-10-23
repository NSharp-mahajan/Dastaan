import express from 'express';
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  previewTrip,
  recalculateTripItinerary
} from '../controllers/tripController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Public itinerary endpoints (no auth required, no DB mutation)
router.post('/preview', previewTrip);
router.post('/recalculate', recalculateTripItinerary);

// Authenticated trip endpoints (require authentication & ownership)
router.post('/', authenticateUser, createTrip);
router.get('/', authenticateUser, getUserTrips);
router.get('/:id', authenticateUser, getTripById);
router.put('/:id', authenticateUser, updateTrip);
router.delete('/:id', authenticateUser, deleteTrip);

export default router;
