import Razorpay from 'razorpay';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';
import PartnerEarnings from '../models/PartnerEarnings.js';
import { notificationTriggers } from '../utils/notificationService.js';
import { validate, schemas } from '../middlewares/validationMiddleware.js';
import { updateEarningsOnPayment } from './earningsController.js';
import logger from '../utils/logger.js';

// Lazily initialize Razorpay after env is loaded
let razorpay = null;

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn('Razorpay keys not configured – payment features are disabled');
    return null;
  }

  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    logger.info('Razorpay initialized successfully');
  }

  return razorpay;
};

export const createOrder = async (req, res) => {
  try {
    const razorpayClient = getRazorpayInstance();
    if (!razorpayClient) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured on the server'
      });
    }

    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create orders for your own bookings'
      });
    }

    if (booking.paymentStatus !== 'unpaid') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been processed for this booking'
      });
    }

    const order = await razorpayClient.orders.create({
      amount: booking.totalAmount * 100,
      currency: 'INR',
      receipt: booking._id.toString()
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    logger.info('Razorpay order created', { bookingId: booking._id, orderId: order.id });

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Error creating Razorpay order', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const { error } = schemas.paymentVerification.validate(req.body);
    if (error) {
      logger.warn('Payment verification validation error', { details: error.details });
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data',
        errors: error.details
      });
    }

    logger.info('Verifying Razorpay payment', {
      razorpay_order_id,
      razorpay_payment_id
    });

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isSignatureValid = generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      logger.warn('Invalid Razorpay payment signature', {
        razorpay_order_id,
        razorpay_payment_id
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Check for duplicate payment verification
    const existingPayment = await Booking.findOne({
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: 'paid'
    });

    if (existingPayment) {
      console.log('⚠️ Payment already processed:', existingPayment._id);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        alreadyProcessed: true
      });
    }

    // Find booking by razorpayOrderId
    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.razorpayPaymentId = razorpay_payment_id;
    
    // Calculate commission only once
    if (!booking.platformCommission && !booking.partnerEarning) {
      const { platformCommission, partnerEarning } = await calculateCommission(booking.totalAmount, booking.userId);
      booking.platformCommission = platformCommission;
      booking.partnerEarning = partnerEarning;
      logger.info('Commission calculated for payment', {
        bookingId: booking._id,
        platformCommission,
        partnerEarning
      });
    }
    
    await booking.save();

    // Update partner earnings
    await updateEarningsOnPayment(booking._id);

    // Trigger notification to partner
    if (req.app.get('io')) {
      await notificationTriggers.paymentCompleted(req.app.get('io'), booking);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    logger.error('Error verifying payment', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
};

export const calculateCommission = async (totalAmount, userId) => {
  // Get user to check premium status
  const User = (await import('../models/User.js')).default;
  const user = await User.findById(userId);
  
  // Premium users get 10% commission, regular users get 20%
  const commissionRate = user?.isPremium && user.premiumExpiry > new Date() ? 0.10 : 0.20;
  const platformCommission = totalAmount * commissionRate;
  const partnerEarning = totalAmount - platformCommission;
  
  logger.info('Commission rate applied', {
    userId,
    commissionRate,
    isPremium: !!user?.isPremium
  });
  
  return {
    platformCommission,
    partnerEarning,
    commissionRate
  };
};

export const processRefund = async (razorpayPaymentId, amount) => {
  try {
    const razorpayClient = getRazorpayInstance();
    if (!razorpayClient) {
      throw new Error('Razorpay not configured');
    }

    const refund = await razorpayClient.payments.refund(razorpayPaymentId, {
      amount: amount * 100
    });
    return refund;
  } catch (error) {
    logger.error('Razorpay refund error', { error, razorpayPaymentId, amount });
    throw error;
  }
};

export const updateEarningsOnRefund = async (bookingId, partnerId) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.partnerEarning) return;

    // Find earnings record
    const earnings = await PartnerEarnings.findOne({ partnerId });
    if (earnings && booking.partnerEarning > 0) {
      // Reverse the earnings
      earnings.totalEarnings -= booking.partnerEarning;
      earnings.availableBalance -= booking.partnerEarning;
      await earnings.save();
      logger.info('Earnings reversed for partner after refund', {
        partnerId,
        amount: booking.partnerEarning
      });
    }

  } catch (error) {
    logger.error('Update earnings on refund error', { error, bookingId, partnerId });
  }
};

export const razorpayWebhook = async (req, res) => {
  try {
    // Temporarily skip signature verification for testing
    // const signature = req.headers["x-razorpay-signature"];
    // const expectedSignature = crypto
    //   .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    //   .update(JSON.stringify(req.body))
    //   .digest("hex");
    // if (signature !== expectedSignature) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid webhook signature'
    //   });
    // }

    logger.info('Razorpay webhook received', { event: req.body.event });

    // Extract event from req.body.event
    const event = req.body.event;

    // If event === "payment.captured"
    if (event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      logger.info('Payment captured via webhook', { orderId });

      // Find booking by razorpayOrderId
      const booking = await Booking.findOne({ razorpayOrderId: orderId });

      // If found, update booking
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        booking.razorpayPaymentId = paymentEntity.id;
        
        // Calculate commission only once
        if (!booking.platformCommission && !booking.partnerEarning) {
          const { platformCommission, partnerEarning } = await calculateCommission(booking.totalAmount, booking.userId);
          booking.platformCommission = platformCommission;
          booking.partnerEarning = partnerEarning;
          logger.info('Commission calculated via webhook', {
            bookingId: booking._id,
            platformCommission,
            partnerEarning
          });
        }
        
        await booking.save();
        
        // Update partner earnings
        await updateEarningsOnPayment(booking._id);
        logger.info('Booking updated successfully via webhook', { bookingId: booking._id });
      } else {
        logger.warn('Booking not found for webhook order', { orderId });
      }
    }

    // Return 200 success
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Error processing Razorpay webhook', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook'
    });
  }
};
