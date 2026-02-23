import Notification from '../models/Notification.js';
import { getUnreadCount } from '../utils/notificationService.js';

// Get all notifications for current user
export const getNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log('=== GET NOTIFICATIONS ===');
    console.log(`User: ${req.user.name} (${userId})`);
    console.log(`Page: ${page}, Limit: ${limit}`);

    // Get notifications with pagination
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await getUnreadCount(userId);

    console.log(`✅ Retrieved ${notifications.length} notifications, ${unreadCount} unread`);

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log('=== MARK NOTIFICATION AS READ ===');
    console.log(`User: ${req.user.name} (${userId})`);
    console.log(`Notification ID: ${id}`);

    // Find and update notification
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Get updated unread count
    const unreadCount = await getUnreadCount(userId);

    console.log(`✅ Notification marked as read: ${id}`);

    res.status(200).json({
      success: true,
      notification,
      unreadCount
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('=== MARK ALL NOTIFICATIONS AS READ ===');
    console.log(`User: ${req.user.name} (${userId})`);

    // Update all unread notifications for user
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);

    res.status(200).json({
      success: true,
      markedCount: result.modifiedCount,
      unreadCount: 0
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get unread count
export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await getUnreadCount(userId);

    console.log(`📊 Unread count for ${req.user.name}: ${unreadCount}`);

    res.status(200).json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log('=== DELETE NOTIFICATION ===');
    console.log(`User: ${req.user.name} (${userId})`);
    console.log(`Notification ID: ${id}`);

    // Find and delete notification
    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Get updated unread count
    const unreadCount = await getUnreadCount(userId);

    console.log(`✅ Notification deleted: ${id}`);

    res.status(200).json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
