import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { subscribePremium, getPremiumStatus } from '../controllers/premiumController.js';

const router = Router();

router.post('/subscribe', protect, subscribePremium);
router.get('/status', protect, getPremiumStatus);

export default router;
