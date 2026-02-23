import Partner from '../models/Partner.js';
import User from '../models/User.js';
import { notificationTriggers } from '../utils/notificationService.js';

const applyForPartner = async (req, res) => {
  try {
    // Ensure req.user exists (protected route)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { bio, hourlyRate, interests, city, experience } = req.body;

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

    const partner = await Partner.create({
      userId: req.user._id,
      bio,
      hourlyRate,
      interests: interests || [],
      city,
      experience,
      approvalStatus: 'pending'
    });

    // Trigger notification to admin
    if (req.app.get('io')) {
      await notificationTriggers.partnerApplication(req.app.get('io'), partner);
    }

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
    const partners = await Partner.find({ approvalStatus: 'approved' })
      .populate('userId', 'name email')
      .select('-documents')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: partners.length,
      data: partners,
      partners
    });

  } catch (error) {
    console.error('Get approved partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching approved partners'
    });
  }
};

const getMyApplication = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const application = await Partner.findOne({ userId: req.user._id });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Get my partner application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner application'
    });
  }
};

export { applyForPartner, getApprovedPartners, getMyApplication };
