import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { blockUser } from '../controllers/userController.js';

const router = Router();

router.post('/block', protect, blockUser);

export default router;
