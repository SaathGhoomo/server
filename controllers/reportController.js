import Report from '../models/Report.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';

export const reportUser = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Extract fields
    const { reportedUserId, bookingId, reason, description } = req.body;

    // Validate required fields
    if (!reportedUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'reportedUserId and reason are required'
      });
    }

    // Cannot report self
    if (reportedUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report yourself'
      });
    }

    // Validate reportedUser exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'Reported user not found'
      });
    }

    // If bookingId provided, validate it exists
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
    }

    // Create Report
    const report = await Report.create({
      reporterId: req.user._id,
      reportedUserId,
      bookingId,
      reason,
      description
    });

    // Return success
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting report',
      error: error.message
    });
  }
};
