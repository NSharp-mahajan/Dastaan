import express from 'express';
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip
} from '../controllers/tripController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// All trip endpoints require authentication and user association
router.post('/', authenticateUser, createTrip);
router.get('/', authenticateUser, getUserTrips);
router.get('/:id', authenticateUser, getTripById);
router.put('/:id', authenticateUser, updateTrip);
router.delete('/:id', authenticateUser, deleteTrip);

export default router;
