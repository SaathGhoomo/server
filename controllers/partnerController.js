import Partner from '../models/Partner.js';
import User from '../models/User.js';

const applyForPartner = async (req, res) => {
  try {
    // Ensure req.user exists (protected route)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Extract fields
    const { bio, hourlyRate, interests, city } = req.body;

    // Validate
    if (!bio || bio.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Bio must be at least 20 characters long'
      });
    }

    if (!hourlyRate || hourlyRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Hourly rate must be greater than 0'
      });
    }

    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City is required'
      });
    }

    // Check if Partner already exists for this userId
    const existingPartner = await Partner.findOne({ userId: req.user._id });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: 'Application already submitted'
      });
    }

    // Create new Partner
    const partner = await Partner.create({
      userId: req.user._id,
      bio,
      hourlyRate,
      interests: interests || [],
      city,
      approvalStatus: 'pending'
    });

    // Return 201 response
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      status: 'pending'
    });

  } catch (error) {
    console.error('Partner application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during partner application'
    });
  }
};

const getApprovedPartners = async (req, res) => {
  try {
    // Fetch approved partners with populated user data
    const partners = await Partner.find({ approvalStatus: 'approved' })
      .populate('userId', 'name email')
      .select('-documents') // Exclude documents field
      .sort({ createdAt: -1 });

    // Return response with count and data
    res.status(200).json({
      success: true,
      count: partners.length,
      data: partners
    });

  } catch (error) {
    console.error('Get approved partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching approved partners'
    });
  }
};

export { applyForPartner, getApprovedPartners };
