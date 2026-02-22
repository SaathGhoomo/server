import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getChatHistory, getUserChats } from '../controllers/chatController.js';

const router = Router();

// All chat routes require authentication
router.use(protect);

// Get chat history for a specific booking
router.get('/:bookingId', getChatHistory);

// Get user's chat list
router.get('/', getUserChats);

export default router;
