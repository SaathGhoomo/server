import Partner from '../models/Partner.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import { notificationTriggers } from '../utils/notificationService.js';
import Booking from '../models/Booking.js';
import ActivityLog from '../models/ActivityLog.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import PartnerEarnings from '../models/PartnerEarnings.js';

const getAllPartnerApplications = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      filter.approvalStatus = status;
    }

    const applications = await Partner.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
      applications
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
    const { id: partnerId } = req.params;
    const { approvalStatus, status } = req.body;

    const newStatus = approvalStatus || status;

    if (!newStatus || !['approved', 'rejected'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Approval status must be either "approved" or "rejected"'
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner application not found'
      });
    }

    if (partner.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Application already processed'
      });
    }

    partner.approvalStatus = newStatus;
    await partner.save();

    // Trigger notification to partner
    if (req.app.get('io')) {
      if (newStatus === 'approved') {
        await notificationTriggers.partnerApproved(req.app.get('io'), partner);
      } else if (newStatus === 'rejected') {
        await notificationTriggers.partnerRejected(req.app.get('io'), partner);
      }
    }

    // Return response
    res.status(200).json({
      success: true,
      message: 'Application updated',
      status: newStatus
    });

  } catch (error) {
    console.error('Update partner status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating partner application'
    });
  }
};

const getAllReports = async (req, res) => {
  try {
    // Fetch all reports with populated user data
    const reports = await Report.find({})
      .populate('reporterId', 'name email')
      .populate('reportedUserId', 'name email')
      .populate('bookingId', 'date totalAmount status')
      .sort({ createdAt: -1 });

    // Return response with count and data
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });

  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports'
    });
  }
};

const reviewReport = async (req, res) => {
  try {
    // Extract reportId from req.params.id
    const { id: reportId } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status
    const allowedStatuses = ['reviewed', 'resolved', 'rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    // Find Report by ID
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update report
    report.status = status;
    if (adminNotes) {
      report.adminNotes = adminNotes;
    }
    if (status === 'resolved') {
      report.resolvedAt = new Date();
    }
    await report.save();

    // Return response
    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report
    });

  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reviewing report'
    });
  }
};

const getModerationOverview = async (req, res) => {
  try {
    // Get total reports
    const totalReports = await Report.countDocuments();
    
    // Get pending reports
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    
    // Get total blocked users (count users with non-empty blockedUsers arrays)
    const usersWithBlocks = await User.find({ 
      blockedUsers: { $exists: true, $ne: [] } 
    });
    const totalBlockedUsers = usersWithBlocks.reduce((total, user) => {
      return total + user.blockedUsers.length;
    }, 0);
    
    // Get total disputes resolved
    const totalDisputesResolved = await Report.countDocuments({ 
      status: 'resolved' 
    });
    
    // Get total bookings cancelled
    const totalBookingsCancelled = await Booking.countDocuments({ 
      status: 'cancelled' 
    });

    // Return overview data
    res.status(200).json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        totalBlockedUsers,
        totalDisputesResolved,
        totalBookingsCancelled
      }
    });

  } catch (error) {
    console.error('Get moderation overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching moderation overview'
    });
  }
};

const getWithdrawalRequests = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({})
      .populate('partnerId')
      .populate({
        path: 'partnerId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching withdrawal requests'
    });
  }
};

const processWithdrawal = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { status, adminNotes } = req.body;

    const request = await WithdrawalRequest.findById(requestId).populate('partnerId');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request already processed'
      });
    }

    if (status === 'approved') {
      request.status = status;
      request.adminNotes = adminNotes;
    } else if (status === 'paid') {
      request.status = status;
      request.adminNotes = adminNotes;
      
      // Deduct amount from partner balance
      const earnings = await PartnerEarnings.findOne({ partnerId: request.partnerId._id });
      if (earnings) {
        earnings.pendingWithdrawals -= request.amount;
        earnings.totalWithdrawn += request.amount;
        earnings.availableBalance -= request.amount;
        earnings.lastWithdrawalAt = new Date();
        await earnings.save();
      }
    } else {
      request.status = status;
      request.adminNotes = adminNotes;
    }
    
    await request.save();

    res.status(200).json({
      success: true,
      message: `Withdrawal ${status}`,
      request
    });

  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing withdrawal'
    });
  }
};

const getRevenueOverview = async (req, res) => {
  try {
    // Total platform revenue from commissions
    const totalRevenue = await Booking.aggregate([
      { $match: { platformCommission: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$platformCommission' } } }
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await Booking.aggregate([
      { $match: { platformCommission: { $exists: true, $gt: 0 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$platformCommission' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Total partner earnings
    const totalPartnerEarnings = await Booking.aggregate([
      { $match: { partnerEarning: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$partnerEarning' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPlatformRevenue: totalRevenue[0]?.total || 0,
        totalPartnerEarnings: totalPartnerEarnings[0]?.total || 0,
        monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Get revenue overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue overview'
    });
  }
};

export { 
  getAllPartnerApplications, 
  updatePartnerStatus, 
  getAllReports, 
  reviewReport, 
  getModerationOverview, 
  getWithdrawalRequests, 
  processWithdrawal, 
  getRevenueOverview 
};
