import cron from 'node-cron';
import User from '../models/User.js';
import logger from './logger.js';

// Job to check and expire premium subscriptions
const expirePremiumSubscriptions = cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Running premium subscription expiry check');
    
    const now = new Date();
    const expiredUsers = await User.updateMany(
      { 
        isPremium: true, 
        premiumExpiry: { $lt: now } 
      },
      { 
        $set: { isPremium: false },
        $unset: { premiumExpiry: 1 }
      }
    );

    if (expiredUsers.modifiedCount > 0) {
      logger.info(`Expired premium for ${expiredUsers.modifiedCount} users`);
    }
  } catch (error) {
    logger.error('Error in premium expiry cron job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Job to clean up old activity logs (older than 90 days)
const cleanupActivityLogs = cron.schedule('0 2 * * 0', async () => {
  try {
    logger.info('Running activity log cleanup');
    
    const ActivityLog = (await import('../models/ActivityLog.js')).default;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info(`Cleaned up ${result.deletedCount} old activity logs`);
  } catch (error) {
    logger.error('Error in activity log cleanup cron job:', error);
  }
}, {
  scheduled: false
});

export {
  expirePremiumSubscriptions,
  cleanupActivityLogs
};
