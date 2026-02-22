import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';
import { calculatePartnerRating } from '../utils/ratingUtils.js';
import { notificationTriggers } from '../utils/notificationService.js';

// Create a new review
export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const userId = req.user._id;

    console.log('=== CREATE REVIEW REQUEST ===');
    console.log('User ID:', userId);
    console.log('Booking ID:', bookingId);
    console.log('Rating:', rating);
    console.log('Comment:', comment);

    // Validate input
    if (!bookingId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('partner');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Security checks
    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only review completed bookings'
      });
    }

    if (booking.reviewed === true) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    // Create the review
    const review = await Review.create({
      booking: bookingId,
      user: userId,
      partner: booking.partner._id,
      rating,
      comment
    });

    // Mark booking as reviewed
    booking.reviewed = true;
    await booking.save();

    // Update partner rating
    await calculatePartnerRating(booking.partner._id);

    // Trigger notification to partner
    if (req.app.get('io')) {
      await notificationTriggers.reviewReceived(req.app.get('io'), populatedReview);
    }

    // Populate review for response
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name email')
      .populate('partner', 'name');

    console.log('Review created successfully:', populatedReview._id);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: populatedReview
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get reviews for a partner
export const getPartnerReviews = async (req, res) => {
  try {
    const { partnerId } = req.params;

    console.log('=== GET PARTNER REVIEWS ===');
    console.log('Partner ID:', partnerId);

    // Validate partner ID
    if (!partnerId || !partnerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid partner ID'
      });
    }

    // Check if partner exists
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Get reviews with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ partner: partnerId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ partner: partnerId });

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { partner: mongoose.Types.ObjectId(partnerId) } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    console.log(`Found ${total} reviews for partner ${partnerId}`);

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      ratingDistribution,
      partnerStats: {
        averageRating: partner.averageRating,
        totalReviews: partner.totalReviews
      }
    });

  } catch (error) {
    console.error('Get partner reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('=== GET USER REVIEWS ===');
    console.log('User ID:', userId);

    const reviews = await Review.find({ user: userId })
      .populate('partner', 'name email')
      .populate('booking', 'date startTime endTime')
      .sort({ createdAt: -1 });

    console.log(`Found ${reviews.length} reviews for user ${userId}`);

    res.status(200).json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
