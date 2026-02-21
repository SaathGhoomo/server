import Razorpay from 'razorpay';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import { updateEarningsOnPayment } from './earningsController.js';

// Initialize Razorpay only if keys are available
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('Razorpay initialized successfully');
} else {
  console.log('Razorpay keys not found - payment features will be disabled');
}

export const createOrder = async (req, res) => {
  try {
    return res.status(503).json({
      success: false,
      message: 'Payment service temporarily unavailable for testing'
    });
    
    // Original code temporarily commented out
    // const { bookingId } = req.body;
    // // Validate booking exists
    // const booking = await Booking.findById(bookingId);
    // if (!booking) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Booking not found'
    //   });
    // }
    // // Ensure booking.userId matches req.user._id
    // if (booking.userId.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized: You can only create orders for your own bookings'
    //   });
    // }
    // // Ensure booking.paymentStatus === "unpaid"
    // if (booking.paymentStatus !== 'unpaid') {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Payment has already been processed for this booking'
    //   });
    // }
    // // Create Razorpay order
    // const order = await razorpay.orders.create({
    //   amount: booking.totalAmount * 100,
    //   currency: 'INR',
    //   receipt: booking._id.toString()
    // });
    // // Save Razorpay orderId inside booking
    // booking.razorpayOrderId = order.id;
    // await booking.save();
    // res.status(200).json({
    //   success: true,
    //   order
    // });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate all fields exist
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'All payment verification fields are required'
      });
    }

    // Create expected signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    // Compare expectedSignature with razorpay_signature
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
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
      console.log(`Commission calculated: ₹${platformCommission} (platform), ₹${partnerEarning} (partner)`);
    }
    
    await booking.save();

    // Update partner earnings
    await updateEarningsOnPayment(booking._id);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
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
  
  console.log(`Commission rate: ${commissionRate * 100}% (${user?.isPremium ? 'Premium' : 'Regular'} user)`);
  
  return {
    platformCommission,
    partnerEarning,
    commissionRate
  };
};

export const processRefund = async (razorpayPaymentId, amount) => {
  try {
    if (!razorpay) {
      throw new Error('Razorpay not initialized');
    }
    
    const refund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: amount * 100
    });
    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error);
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
      console.log(`Earnings reversed for partner ${partnerId}: -₹${booking.partnerEarning}`);
    }

  } catch (error) {
    console.error('Update earnings on refund error:', error);
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

    console.log('Webhook received:', JSON.stringify(req.body, null, 2));

    // Extract event from req.body.event
    const event = req.body.event;

    // If event === "payment.captured"
    if (event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;

      console.log('Payment captured for order:', orderId);

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
          console.log(`Commission calculated via webhook: ₹${platformCommission} (platform), ₹${partnerEarning} (partner)`);
        }
        
        await booking.save();
        
        // Update partner earnings
        await updateEarningsOnPayment(booking._id);
        console.log('Booking updated successfully');
      } else {
        console.log('Booking not found for order:', orderId);
      }
    }

    // Return 200 success
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
};
