import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getAdminStats, getDetailedAnalytics } from '../controllers/adminAnalyticsController.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorizeRoles('admin'));

// Get admin dashboard statistics
router.get('/stats', getAdminStats);

// Get detailed analytics
router.get('/analytics', getDetailedAnalytics);

export default router;
