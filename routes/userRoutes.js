import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMe, blockUser } from '../controllers/userController.js';

const router = Router();

router.get('/me', protect, getMe);
router.post('/block', protect, blockUser);

export default router;
