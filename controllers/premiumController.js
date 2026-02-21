import PremiumSubscription from '../models/PremiumSubscription.js';
import User from '../models/User.js';

const PLANS = {
  monthly: { price: 299, duration: 30 },
  quarterly: { price: 799, duration: 90 },
  yearly: { price: 2499, duration: 365 }
};

export const subscribePremium = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await PremiumSubscription.findOne({
      userId: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active premium subscription'
      });
    }

    const planDetails = PLANS[plan];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDetails.duration);

    // Create subscription (pending payment)
    const subscription = await PremiumSubscription.create({
      userId: req.user._id,
      plan,
      startDate,
      endDate,
      amount: planDetails.price
    });

    res.status(201).json({
      success: true,
      message: 'Premium subscription created',
      subscription,
      amount: planDetails.price
    });

  } catch (error) {
    console.error('Subscribe premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating premium subscription'
    });
  }
};

export const getPremiumStatus = async (req, res) => {
  try {
    const subscription = await PremiumSubscription.findOne({
      userId: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    const isPremium = !!subscription;

    res.status(200).json({
      success: true,
      data: {
        isPremium,
        subscription
      }
    });

  } catch (error) {
    console.error('Get premium status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching premium status'
    });
  }
};

export const activatePremiumSubscription = async (userId, paymentId) => {
  try {
    const subscription = await PremiumSubscription.findOne({
      userId,
      status: 'active'
    });

    if (subscription) {
      subscription.razorpayPaymentId = paymentId;
      await subscription.save();
      console.log(`Premium subscription activated for user ${userId}`);
    }

  } catch (error) {
    console.error('Activate premium subscription error:', error);
  }
};
