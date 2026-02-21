import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';

const createBooking = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Extract fields
    const { partnerId, date, startTime, endTime } = req.body;

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

    // Calculate duration in hours
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours + minutes / 60;
    };

    const startHours = parseTime(startTime);
    const endHours = parseTime(endTime);
    const duration = endHours - startHours;

    // Validate duration
    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Calculate total amount
    const totalAmount = duration * partner.hourlyRate;

    // Create Booking
    const booking = await Booking.create({
      userId: req.user._id,
      partnerId,
      date: bookingDate,
      startTime,
      endTime,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid'
    });

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

    // Fetch bookings for current user
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

    // Return response with count and data
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
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

    // Fetch bookings for this partner
    const bookings = await Booking.find({ partnerId: partner._id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Return response with count and data
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.error('Get partner bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner bookings'
    });
  }
};

export { createBooking, getUserBookings, getPartnerBookings };
