import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { 
  getAllPartnerApplications, 
  updatePartnerStatus, 
  getAllReports, 
  reviewReport, 
  getModerationOverview, 
  getWithdrawalRequests, 
  processWithdrawal, 
  getRevenueOverview 
} from '../controllers/adminController.js';

const router = Router();

router.get(
  '/partners',
  protect,
  authorizeRoles('admin'),
  getAllPartnerApplications
);

router.patch(
  '/partners/:id',
  protect,
  authorizeRoles('admin'),
  updatePartnerStatus
);

router.get(
  '/reports',
  protect,
  authorizeRoles('admin'),
  getAllReports
);

router.patch(
  '/reports/:id',
  protect,
  authorizeRoles('admin'),
  reviewReport
);

router.get(
  '/moderation/overview',
  protect,
  authorizeRoles('admin'),
  getModerationOverview
);

router.get(
  '/withdrawals',
  protect,
  authorizeRoles('admin'),
  getWithdrawalRequests
);

router.patch(
  '/withdrawals/:id',
  protect,
  authorizeRoles('admin'),
  processWithdrawal
);

router.get(
  '/revenue',
  protect,
  authorizeRoles('admin'),
  getRevenueOverview
);

export default router;
