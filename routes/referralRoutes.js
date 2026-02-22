import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getReferralCode } from '../controllers/referralController.js';

const router = Router();
router.get('/code', protect, getReferralCode);
export default router;
