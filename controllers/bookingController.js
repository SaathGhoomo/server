import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';
import User from '../models/User.js';
import { processRefund } from './paymentController.js';
import { notificationTriggers } from '../utils/notificationService.js';

const createBooking = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { partnerId, date, startTime, endTime, message } = req.body;

    // Debug logging
    console.log('Booking request:', {
      partnerId,
      date,
      startTime,
      endTime,
      userId: req.user._id
    });

    // Validate all fields exist
    if (!partnerId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Validate startTime !== endTime
    if (startTime === endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time cannot be the same'
      });
    }

    // Find Partner by partnerId
    console.log('Looking for partner with ID:', partnerId);
    const partner = await Partner.findById(partnerId);
    console.log('Found partner:', partner);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if partner is approved
    if (partner.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Partner not available'
      });
    }

    // Prevent self booking
    if (partner.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book yourself'
      });
    }

    // Check if user blocked partner
    const currentUser = await User.findById(req.user._id);
    if (currentUser.blockedUsers.includes(partner.userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Cannot book this partner - you have blocked them'
      });
    }

    // Check if partner blocked user
    const partnerUser = await User.findById(partner.userId);
    if (partnerUser.blockedUsers.includes(req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Cannot book this partner - they have blocked you'
      });
    }

    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours + minutes / 60;
    };

    const startHours = parseTime(startTime);
    const endHours = parseTime(endTime);
    const duration = endHours - startHours;

    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const totalAmount = duration * partner.hourlyRate;

    const booking = await Booking.create({
      userId: req.user._id,
      partnerId,
      date: bookingDate,
      startTime,
      endTime,
      totalAmount,
      duration,
      message,
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    // Trigger notification to partner
    // Note: We'll get io from the app instance through a middleware
    if (req.app.get('io')) {
      await notificationTriggers.bookingCreated(req.app.get('io'), booking);
    }

    // Return response
    res.status(201).json({
      success: true,
      bookingId: booking._id,
      totalAmount
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during booking creation'
    });
  }
};

const getUserBookings = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const bookings = await Booking.find({ userId: req.user._id })
      .populate({
        path: 'partnerId',
        select: 'bio hourlyRate city',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
      bookings
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
};

const getPartnerBookings = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Find Partner document for current user
    const partner = await Partner.findOne({ userId: req.user._id });
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'Not a partner'
      });
    }

    const bookings = await Booking.find({ partnerId: partner._id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
      bookings
    });

  } catch (error) {
    console.error('Get partner bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner bookings'
    });
  }
};

const updateBookingStatusByPartner = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const partner = await Partner.findOne({ userId: req.user._id });
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'Not a partner'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.partnerId.toString() !== partner._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only manage your own bookings'
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a completed or cancelled booking'
      });
    }

    if (status === 'accepted') {
      booking.status = 'confirmed';
    } else if (status === 'rejected') {
      booking.status = 'cancelled';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status action'
      });
    }

    await booking.save();

    // Trigger notification to user
    if (req.app.get('io')) {
      if (status === 'accepted') {
        await notificationTriggers.bookingAccepted(req.app.get('io'), booking);
      } else if (status === 'rejected') {
        await notificationTriggers.bookingRejected(req.app.get('io'), booking);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking status by partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    // Extract bookingId from req.params.id
    const bookingId = req.params.id;

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure booking.userId === req.user._id
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only cancel your own bookings'
      });
    }

    // If status === "cancelled" → 400
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // If status === "completed" → 400
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking'
      });
    }

    // If booking.date < today → 400
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel past bookings'
      });
    }

    // If paymentStatus === "paid" → set paymentStatus = "refunded"
    if (booking.paymentStatus === 'paid') {
      try {
        // Process Razorpay refund
        if (booking.razorpayPaymentId) {
          await processRefund(booking.razorpayPaymentId, booking.totalAmount);
          console.log('Refund processed successfully for payment:', booking.razorpayPaymentId);
        }
        
        // Financial integrity: Reverse commission on refund
        booking.platformCommission = 0;
        booking.partnerEarning = 0;
        booking.paymentStatus = 'refunded';
        
        // Update partner earnings to reverse the amount
        const { updateEarningsOnRefund } = await import('./paymentController.js');
        await updateEarningsOnRefund(booking._id, booking.partnerId);
        
      } catch (refundError) {
        console.error('Refund failed:', refundError);
        // Still allow cancellation but log the refund error
        return res.status(500).json({
          success: false,
          message: 'Booking cancelled but refund failed. Please contact support.',
          error: refundError.message
        });
      }
    }

    // Set status = "cancelled"
    booking.status = 'cancelled';

    // Save booking
    await booking.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking',
      error: error.message
    });
  }
};

const completeBooking = async (req, res) => {
  try {
    // Extract bookingId
    const bookingId = req.params.id;

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find Partner by userId = req.user._id
    const partner = await Partner.findOne({ userId: req.user._id });
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'Not a partner'
      });
    }

    // Ensure booking.partnerId === partner._id
    if (booking.partnerId.toString() !== partner._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only complete your own bookings'
      });
    }

    // If status !== "confirmed" → 400
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only complete confirmed bookings'
      });
    }

    // Set status = "completed"
    booking.status = 'completed';

    // Save
    await booking.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Booking completed successfully',
      booking
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing booking',
      error: error.message
    });
  }
};

export { createBooking, getUserBookings, getPartnerBookings, updateBookingStatusByPartner, cancelBooking, completeBooking };
