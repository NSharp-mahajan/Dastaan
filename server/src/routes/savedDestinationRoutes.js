import express from 'express';
import {
  getSavedDestinations,
  saveDestination,
  removeSavedDestination
} from '../controllers/savedDestinationController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/saved', authenticateUser, getSavedDestinations);
router.post('/save', authenticateUser, saveDestination);
router.delete('/:destinationId', authenticateUser, removeSavedDestination);

export default router;
