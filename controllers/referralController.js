export const getReferralCode = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const userId = req.user._id.toString();
    const referralCode = 'SG-' + userId.slice(-8).toUpperCase();
    res.status(200).json({ success: true, referralCode });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
