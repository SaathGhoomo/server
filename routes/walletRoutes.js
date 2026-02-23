import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getWallet, withdrawWallet, transferWallet } from '../controllers/walletController.js';

const router = Router();
router.use(protect);

router.get('/', getWallet);
router.post('/withdraw', withdrawWallet);
router.post('/transfer', transferWallet);

export default router;
