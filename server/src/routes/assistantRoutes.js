import express from 'express';
import { handleAssistantChat } from '../controllers/assistantController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/assistant/chat
 * Natural conversation, preference extraction, grounding, confirmation, and modification.
 */
router.post('/chat', optionalAuth, handleAssistantChat);

export default router;
