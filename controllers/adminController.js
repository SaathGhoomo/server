import Partner from '../models/Partner.js';

const getAllPartnerApplications = async (req, res) => {
  try {
    // Fetch all Partner documents with populated user data
    const applications = await Partner.find({})
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    // Return response with count and data
    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });

  } catch (error) {
    console.error('Get partner applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner applications'
    });
  }
};

const updatePartnerStatus = async (req, res) => {
  try {
    // Extract partnerId from req.params.id
    const { id: partnerId } = req.params;
    const { approvalStatus } = req.body;

    // Validate approvalStatus
    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Approval status must be either "approved" or "rejected"'
      });
    }

    // Find Partner by ID
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner application not found'
      });
    }

    // If approvalStatus already not "pending"
    if (partner.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Application already processed'
      });
    }

    // Update approvalStatus
    partner.approvalStatus = approvalStatus;
    await partner.save();

    // Return response
    res.status(200).json({
      success: true,
      message: 'Application updated',
      status: approvalStatus
    });

  } catch (error) {
    console.error('Update partner status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating partner application'
    });
  }
};

export { getAllPartnerApplications, updatePartnerStatus };
