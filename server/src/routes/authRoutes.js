import express from 'express';
import { signup, login, getMe } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/register', signup);
router.post('/login', login);
router.get('/me', authenticateUser, getMe);

export default router;
