import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validationRules, validate } from '../middlewares/validate.js';
import { getPartnerEarnings, requestWithdrawal } from '../controllers/earningsController.js';

const router = Router();

router.get('/partner', protect, getPartnerEarnings);
router.post('/withdrawal', protect, validate(validationRules.withdrawalRequest), requestWithdrawal);

export default router;
