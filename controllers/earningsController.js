import PartnerEarnings from '../models/PartnerEarnings.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';

export const getPartnerEarnings = async (req, res) => {
  try {
    // Find Partner for current user
    const partner = await Partner.findOne({ userId: req.user._id });
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'Not a partner'
      });
    }

    // Find or create earnings record
    let earnings = await PartnerEarnings.findOne({ partnerId: partner._id });
    
    if (!earnings) {
      earnings = await PartnerEarnings.create({
        partnerId: partner._id,
        totalEarnings: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0
      });
    }

    res.status(200).json({
      success: true,
      data: earnings
    });

  } catch (error) {
    console.error('Get partner earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching earnings'
    });
  }
};

export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, upiId } = req.body;

    // Find Partner for current user
    const partner = await Partner.findOne({ userId: req.user._id });
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'Not a partner'
      });
    }

    // Get earnings
    const earnings = await PartnerEarnings.findOne({ partnerId: partner._id });
    if (!earnings || earnings.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create withdrawal request
    const withdrawal = await WithdrawalRequest.create({
      partnerId: partner._id,
      amount,
      upiId
    });

    // Update pending withdrawals
    earnings.pendingWithdrawals += amount;
    await earnings.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      withdrawal
    });

  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while requesting withdrawal'
    });
  }
};

export const updateEarningsOnPayment = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId).populate('partnerId');
    if (!booking || !booking.partnerEarning) return;

    // Find or create earnings record
    let earnings = await PartnerEarnings.findOne({ partnerId: booking.partnerId._id });
    
    if (!earnings) {
      earnings = await PartnerEarnings.create({
        partnerId: booking.partnerId._id,
        totalEarnings: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0
      });
    }

    // Update earnings
    earnings.totalEarnings += booking.partnerEarning;
    earnings.availableBalance += booking.partnerEarning;
    await earnings.save();

    console.log(`Earnings updated for partner ${booking.partnerId._id}: +₹${booking.partnerEarning}`);

  } catch (error) {
    console.error('Update earnings error:', error);
  }
};
