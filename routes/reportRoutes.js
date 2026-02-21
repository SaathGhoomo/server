import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/activityMiddleware.js';
import { reportUser } from '../controllers/reportController.js';

const router = Router();

router.post('/', protect, logActivity('report_created'), reportUser);

export default router;
