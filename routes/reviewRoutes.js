import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createReview, getPartnerReviews, getUserReviews } from '../controllers/reviewController.js';
import { validationRules, validate } from '../middlewares/validate.js';

const router = Router();

// Validation rules for reviews
const reviewValidationRules = {
  create: [
    // bookingId will be validated in controller
    // rating will be validated in controller
    // comment will be validated in controller
  ]
};

// Routes
router.post('/', protect, createReview);
router.get('/partner/:partnerId', getPartnerReviews);
router.get('/my-reviews', protect, getUserReviews);

export default router;
