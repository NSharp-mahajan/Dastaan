import express from 'express';
import {
  searchDestinationsHandler,
  getPopularDestinationsHandler,
  getDestinationPlacesHandler
} from '../controllers/travelDataController.js';
import {
  getSavedDestinations,
  saveDestination,
  removeSavedDestination
} from '../controllers/savedDestinationController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// 1. Dynamic Destination Discovery Endpoints (Public)
router.get('/search', searchDestinationsHandler);
router.get('/popular', getPopularDestinationsHandler);
router.get('/places', getDestinationPlacesHandler);
router.get('/:destination/places', getDestinationPlacesHandler);

// 2. User Saved Destination Endpoints (Private / Authenticated)
router.get('/saved', authenticateUser, getSavedDestinations);
router.post('/save', authenticateUser, saveDestination);
router.delete('/:destinationId', authenticateUser, removeSavedDestination);

export default router;
