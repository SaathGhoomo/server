import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Create and emit notification
export const createNotification = async (io, userId, type, title, message, link = null, data = {}) => {
  try {
    console.log(`=== CREATING NOTIFICATION ===`);
    console.log(`User: ${userId}`);
    console.log(`Type: ${type}`);
    console.log(`Title: ${title}`);
    console.log(`Message: ${message}`);

    // Create notification in database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      data
    });

    // Populate user info for socket emission
    const populatedNotification = await Notification.findById(notification._id)
      .populate('userId', 'name email')
      .lean();

    // Emit real-time notification to user's socket room
    io.to(userId.toString()).emit('new-notification', populatedNotification);

    console.log(`✅ Notification created and emitted: ${notification._id}`);

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Notification triggers for different events
export const notificationTriggers = {
  // Booking created → notify partner
  bookingCreated: async (io, booking) => {
    if (booking.partnerId?.userId) {
      await createNotification(
        io,
        booking.partnerId.userId._id,
        'booking_created',
        'New Booking Request',
        `You have a new booking request from ${booking.user?.name || 'A user'}`,
        `/partner/bookings`,
        { bookingId: booking._id }
      );
    }
  },

  // Booking accepted → notify user
  bookingAccepted: async (io, booking) => {
    if (booking.user) {
      await createNotification(
        io,
        booking.user._id,
        'booking_accepted',
        'Booking Accepted',
        `Your booking has been accepted by ${booking.partnerId?.userId?.name || 'the partner'}`,
        `/my-bookings`,
        { bookingId: booking._id }
      );
    }
  },

  // Booking rejected → notify user
  bookingRejected: async (io, booking) => {
    if (booking.user) {
      await createNotification(
        io,
        booking.user._id,
        'booking_rejected',
        'Booking Rejected',
        `Your booking was rejected by ${booking.partnerId?.userId?.name || 'the partner'}`,
        `/my-bookings`,
        { bookingId: booking._id }
      );
    }
  },

  // Payment completed → notify partner
  paymentCompleted: async (io, booking) => {
    if (booking.partnerId?.userId) {
      await createNotification(
        io,
        booking.partnerId.userId._id,
        'payment_completed',
        'Payment Received',
        `Payment received for booking with ${booking.user?.name || 'a user'}`,
        `/partner/bookings`,
        { bookingId: booking._id, amount: booking.totalAmount }
      );
    }
  },

  // New message → notify other party
  newMessage: async (io, message) => {
    // Get booking to find other party
    const Booking = require('../models/Booking.js').default;
    const booking = await Booking.findById(message.booking).populate('user partnerId.userId');
    
    if (!booking) return;

    // Determine who should receive the notification
    let recipientId = null;
    let senderName = 'Someone';
    
    if (message.sender._id.toString() === booking.user._id.toString()) {
      // Message from user, notify partner
      recipientId = booking.partnerId?.userId?._id;
      senderName = booking.user?.name || 'User';
    } else {
      // Message from partner, notify user
      recipientId = booking.user?._id;
      senderName = booking.partnerId?.userId?.name || 'Partner';
    }

    if (recipientId) {
      await createNotification(
        io,
        recipientId,
        'new_message',
        'New Message',
        `New message from ${senderName}`,
        `/chat/${booking._id}`,
        { 
          bookingId: booking._id,
          messageId: message._id,
          senderId: message.sender._id
        }
      );
    }
  },

  // Partner application submitted → notify admin
  partnerApplication: async (io, partner) => {
    // Get all admin users
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      await createNotification(
        io,
        admin._id,
        'partner_application',
        'New Partner Application',
        `New partner application from ${partner.name}`,
        `/admin/partner-approval`,
        { partnerId: partner._id }
      );
    }
  },

  // Partner approved → notify partner
  partnerApproved: async (io, partner) => {
    await createNotification(
      io,
      partner.userId._id,
      'partner_approved',
      'Partner Application Approved',
      'Congratulations! Your partner application has been approved',
      `/dashboard`,
      { partnerId: partner._id }
    );
  },

  // Partner rejected → notify partner
  partnerRejected: async (io, partner) => {
    await createNotification(
      io,
      partner.userId._id,
      'partner_rejected',
      'Partner Application Rejected',
      'Your partner application was not approved',
      `/dashboard`,
      { partnerId: partner._id }
    );
  },

  // Review received → notify partner
  reviewReceived: async (io, review) => {
    // Get partner from review
    const Partner = require('../models/Partner.js').default;
    const partner = await Partner.findById(review.partner).populate('userId');
    
    if (partner?.userId) {
      await createNotification(
        io,
        partner.userId._id,
        'review_received',
        'New Review Received',
        `You received a ${review.rating}-star review`,
        `/dashboard`,
        { reviewId: review._id, rating: review.rating }
      );
    }
  },

  // Wallet updated → notify user
  walletUpdated: async (io, userId, amount, type) => {
    const title = type === 'credit' ? 'Wallet Credited' : 'Wallet Debited';
    const message = type === 'credit' 
      ? `₹${amount} credited to your wallet`
      : `₹${amount} debited from your wallet`;
    
    await createNotification(
      io,
      userId,
      'wallet_updated',
      title,
      message,
      `/wallet`,
      { amount, type }
    );
  }
};

// Get unread count for user
export const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });
    return count;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};
