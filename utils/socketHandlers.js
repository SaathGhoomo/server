import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import ChatMessage from '../models/ChatMessage.js';
import { getUnreadCount } from './notificationService.js';
import { notificationTriggers } from './notificationService.js';

// Socket authentication middleware
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
};

// Validate user access to booking
export const validateBookingAccess = async (userId, bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('user partnerId.userId');

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user is the booking owner or the partner
    const isUser = booking.user._id.toString() === userId.toString();
    const isPartner = booking.partnerId?.userId?._id.toString() === userId.toString();

    if (!isUser && !isPartner) {
      throw new Error('Access denied: User not associated with this booking');
    }

    // Check booking status
    if (booking.status !== 'accepted' && booking.status !== 'paid' && booking.status !== 'completed') {
      throw new Error('Chat not available for this booking status');
    }

    return booking;
  } catch (error) {
    console.error('Booking access validation error:', error);
    throw error;
  }
};

// Handle socket connection
export const handleConnection = async (socket, io) => {
  try {
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.user._id})`);
    
    // Join user's personal room for notifications
    const userRoom = `user_${socket.user._id}`;
    await socket.join(userRoom);
    console.log(`👤 User ${socket.user.name} joined room: ${userRoom}`);

    // Send unread notification count
    const unreadCount = await getUnreadCount(socket.user._id);
    socket.emit('unread-count', { count: unreadCount });

    // Join room
    socket.on('join-room', async (bookingId) => {
      await handleJoinRoom(io, socket, bookingId);
    });

    // Send message
    socket.on('send-message', async (data) => {
      await handleSendMessage(io, socket, data);
    });

    // Leave room
    socket.on('leave-room', async (bookingId) => {
      await handleLeaveRoom(socket, bookingId);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.user.name} - ${reason}`);
      handleDisconnect(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      
      // Disconnect on critical errors
      if (error.message.includes('authentication')) {
        socket.disconnect();
      }
    });

  } catch (error) {
    console.error('Socket connection error:', error);
    socket.disconnect();
  }
};

// Handle joining a room
export const handleJoinRoom = async (io, socket, bookingId) => {
  try {
    console.log(`=== JOIN ROOM REQUEST ===`);
    console.log(`User: ${socket.user.name} (${socket.user._id})`);
    console.log(`Booking ID: ${bookingId}`);

    // Validate booking access
    const booking = await validateBookingAccess(socket.user._id, bookingId);

    // Join the room
    const roomName = `booking_${bookingId}`;
    await socket.join(roomName);

    // Notify others in the room
    socket.to(roomName).emit('user-joined', {
      userId: socket.user._id,
      userName: socket.user.name,
      bookingId,
      timestamp: new Date()
    });

    // Send success response
    socket.emit('room-joined', {
      bookingId,
      roomName,
      booking: {
        id: booking._id,
        status: booking.status,
        partnerName: booking.partnerId?.userId?.name || 'Partner',
        userName: booking.user?.name || 'User'
      }
    });

    console.log(`✅ User ${socket.user.name} joined room ${roomName}`);

  } catch (error) {
    console.error('Join room error:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle sending messages
export const handleSendMessage = async (io, socket, data) => {
  try {
    const { bookingId, message } = data;

    console.log(`=== SEND MESSAGE REQUEST ===`);
    console.log(`User: ${socket.user.name} (${socket.user._id})`);
    console.log(`Booking ID: ${bookingId}`);
    console.log(`Message: ${message}`);

    // Validate input
    if (!bookingId || !message || !message.trim()) {
      return socket.emit('error', { message: 'Booking ID and message are required' });
    }

    if (message.length > 1000) {
      return socket.emit('error', { message: 'Message too long (max 1000 characters)' });
    }

    // Validate booking access
    const booking = await validateBookingAccess(socket.user._id, bookingId);

    // Create message in database
    const chatMessage = await ChatMessage.create({
      booking: bookingId,
      sender: socket.user._id,
      message: message.trim(),
      messageType: 'text'
    });

    // Populate sender info
    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('sender', 'name email role')
      .lean();

    const roomName = `booking_${bookingId}`;

    // Broadcast message to all users in the room
    io.to(roomName).emit('receive-message', {
      id: populatedMessage._id,
      bookingId,
      sender: {
        id: populatedMessage.sender._id,
        name: populatedMessage.sender.name,
        role: populatedMessage.sender.role
      },
      message: populatedMessage.message,
      timestamp: populatedMessage.createdAt,
      isOwnMessage: false
    });

    // Trigger notification to other party
    await notificationTriggers.newMessage(io, populatedMessage);

    console.log(`✅ Message sent in room ${roomName} by ${socket.user.name}`);

  } catch (error) {
    console.error('Send message error:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle leaving a room
export const handleLeaveRoom = async (socket, bookingId) => {
  try {
    const roomName = `booking_${bookingId}`;
    await socket.leave(roomName);

    // Notify others in the room
    socket.to(roomName).emit('user-left', {
      userId: socket.user._id,
      userName: socket.user.name,
      bookingId,
      timestamp: new Date()
    });

    socket.emit('room-left', { bookingId });
    console.log(`👋 User ${socket.user.name} left room ${roomName}`);

  } catch (error) {
    console.error('Leave room error:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle disconnection
export const handleDisconnect = (socket) => {
  console.log(`🔌 User ${socket.user.name} disconnected`);
};
