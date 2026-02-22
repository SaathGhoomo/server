import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadNotificationsCount,
  deleteNotification
} from '../controllers/notificationController.js';

const router = Router();

// All notification routes require authentication
router.use(protect);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadNotificationsCount);

// Mark notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

export default router;
