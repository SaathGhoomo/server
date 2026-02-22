import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Booking from '../models/Booking.js';
import PartnerEarnings from '../models/PartnerEarnings.js';

// Get admin dashboard statistics
export const getAdminStats = async (req, res) => {
  try {
    console.log('=== GET ADMIN STATS ===');
    console.log(`Admin: ${req.user.name} (${req.user._id})`);

    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    // Get total counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalPartners = await Partner.countDocuments({ approvalStatus: 'approved' });
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ 
      status: { $in: ['confirmed', 'paid'] }
    });
    const pendingApplications = await Partner.countDocuments({ approvalStatus: 'pending' });

    // Get total revenue from completed bookings
    const completedBookings = await Booking.find({ 
      paymentStatus: 'paid' 
    }).select('totalAmount');
    
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Get monthly revenue for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyBookings = await Booking.find({
      paymentStatus: 'paid',
      createdAt: { $gte: twelveMonthsAgo }
    }).select('totalAmount createdAt');

    // Group by month
    const monthlyRevenue = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    monthlyBookings.forEach(booking => {
      const month = new Date(booking.createdAt).getMonth();
      const monthName = monthNames[month];
      
      if (!monthlyRevenue[monthName]) {
        monthlyRevenue[monthName] = 0;
      }
      monthlyRevenue[monthName] += booking.totalAmount;
    });

    // Convert to array format
    const monthlyRevenueArray = monthNames.map(month => ({
      month,
      revenue: monthlyRevenue[month] || 0
    }));

    // Get top partners by revenue
    const topPartnersData = await PartnerEarnings.aggregate([
      {
        $group: {
          _id: '$partnerId',
          totalBookings: { $sum: '$totalBookings' },
          totalRevenue: { $sum: '$totalEarnings' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'partners',
          localField: '_id',
          foreignField: '_id',
          as: 'partnerInfo'
        }
      },
      {
        $unwind: '$partnerInfo'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'partnerInfo.userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      }
    ]);

    const topPartners = topPartnersData.map(item => ({
      name: item.userInfo?.name || 'Unknown',
      totalBookings: item.totalBookings || 0,
      revenue: item.totalRevenue || 0
    }));

    const stats = {
      totalUsers,
      totalPartners,
      totalBookings,
      totalRevenue,
      activeBookings,
      pendingApplications,
      monthlyRevenue: monthlyRevenueArray,
      topPartners
    };

    console.log('✅ Admin stats retrieved successfully');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Partners: ${totalPartners}`);
    console.log(`Total Revenue: ₹${totalRevenue}`);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get detailed analytics data
export const getDetailedAnalytics = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { period = '30days', type = 'overview' } = req.query;

    let startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get bookings in period
    const periodBookings = await Booking.find({
      createdAt: { $gte: startDate }
    }).populate('user partnerId.userId');

    // Calculate metrics
    const metrics = {
      totalBookings: periodBookings.length,
      totalRevenue: periodBookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + b.totalAmount, 0),
      averageBookingValue: periodBookings.length > 0 
        ? periodBookings.reduce((sum, b) => sum + b.totalAmount, 0) / periodBookings.length 
        : 0,
      conversionRate: periodBookings.length > 0 
        ? (periodBookings.filter(b => b.paymentStatus === 'paid').length / periodBookings.length) * 100 
        : 0
    };

    res.status(200).json({
      success: true,
      period,
      metrics,
      bookings: periodBookings
    });

  } catch (error) {
    console.error('Get detailed analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
