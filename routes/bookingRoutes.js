import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/activityMiddleware.js';
import { validationRules, validate } from '../middlewares/validate.js';
import { createBooking, getUserBookings, getPartnerBookings, updateBookingStatusByPartner, cancelBooking, completeBooking } from '../controllers/bookingController.js';

const router = Router();

router.post('/', protect, validate(validationRules.createBooking), logActivity('booking_created'), createBooking);
router.get('/my-bookings', protect, getUserBookings);
router.get('/partner-bookings', protect, getPartnerBookings);
router.patch('/:id', protect, logActivity('booking_status_updated'), updateBookingStatusByPartner);
router.patch('/:id/cancel', protect, logActivity('booking_cancelled'), cancelBooking);
router.patch('/:id/complete', protect, logActivity('booking_completed'), completeBooking);

export default router;
