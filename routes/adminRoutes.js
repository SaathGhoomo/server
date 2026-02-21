import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getAllPartnerApplications, updatePartnerStatus } from '../controllers/adminController.js';

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

export default router;
