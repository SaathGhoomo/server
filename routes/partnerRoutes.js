import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { applyForPartner, getApprovedPartners } from '../controllers/partnerController.js';

const router = Router();

router.post('/apply', protect, applyForPartner);
router.get('/', getApprovedPartners);

export default router;
