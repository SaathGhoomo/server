import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validationRules, validate } from '../middlewares/validate.js';
import { applyForPartner, getApprovedPartners } from '../controllers/partnerController.js';

const router = Router();

router.post('/apply', protect, validate(validationRules.partnerApply), applyForPartner);
router.get('/', getApprovedPartners);

export default router;
