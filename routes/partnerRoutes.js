import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validationRules, validate } from '../middlewares/validate.js';
import { applyForPartner, getApprovedPartners, getMyApplication } from '../controllers/partnerController.js';

const router = Router();

router.post('/apply', protect, validate(validationRules.partnerApply), applyForPartner);
router.get('/', getApprovedPartners);
router.get('/my-application', protect, getMyApplication);

export default router;
