import ChatMessage from '../models/ChatMessage.js';
import Booking from '../models/Booking.js';
import { validateBookingAccess } from '../utils/socketHandlers.js';

// Get chat history for a booking
export const getChatHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    console.log('=== GET CHAT HISTORY ===');
    console.log(`User: ${req.user.name} (${userId})`);
    console.log(`Booking ID: ${bookingId}`);

    // Validate booking access
    const booking = await validateBookingAccess(userId, bookingId);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get messages with pagination
    const messages = await ChatMessage.find({ booking: bookingId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments({ booking: bookingId });

    // Mark messages as read by current user (optional enhancement)
    await ChatMessage.updateMany(
      { 
        booking: bookingId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    console.log(`✅ Retrieved ${messages.length} messages for booking ${bookingId}`);

    res.status(200).json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      booking: {
        id: booking._id,
        status: booking.status,
        partnerName: booking.partnerId?.userId?.name || 'Partner',
        userName: booking.user?.name || 'User'
      }
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chat history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's chat list (bookings with chat access)
export const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('=== GET USER CHATS ===');
    console.log(`User: ${req.user.name} (${userId})`);

    let bookings;

    if (req.user.role === 'user') {
      // For regular users, get their bookings
      bookings = await Booking.find({
        user: userId,
        status: { $in: ['accepted', 'paid', 'completed'] }
      })
      .populate('partnerId.userId', 'name email')
      .sort({ updatedAt: -1 });
    } else if (req.user.role === 'partner') {
      // For partners, get their assigned bookings
      bookings = await Booking.find({
        'partnerId.userId': userId,
        status: { $in: ['accepted', 'paid', 'completed'] }
      })
      .populate('user', 'name email')
      .sort({ updatedAt: -1 });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get last message for each booking
    const chatsWithLastMessage = await Promise.all(
      bookings.map(async (booking) => {
        const lastMessage = await ChatMessage.findOne({ booking: booking._id })
          .populate('sender', 'name')
          .sort({ createdAt: -1 });

        const unreadCount = await ChatMessage.countDocuments({
          booking: booking._id,
          sender: { $ne: userId },
          'readBy.user': { $ne: userId }
        });

        return {
          bookingId: booking._id,
          status: booking.status,
          otherUser: req.user.role === 'user' 
            ? booking.partnerId?.userId 
            : booking.user,
          lastMessage: lastMessage ? {
            id: lastMessage._id,
            message: lastMessage.message,
            sender: lastMessage.sender.name,
            timestamp: lastMessage.createdAt
          } : null,
          unreadCount,
          updatedAt: booking.updatedAt
        };
      })
    );

    console.log(`✅ Retrieved ${chatsWithLastMessage.length} chats for user ${req.user.name}`);

    res.status(200).json({
      success: true,
      chats: chatsWithLastMessage
    });

  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
