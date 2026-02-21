import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/activityMiddleware.js';
import { createOrder, verifyPayment, razorpayWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, logActivity('payment_verified'), verifyPayment);
router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), razorpayWebhook);

export default router;
