import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createBooking, getUserBookings, getPartnerBookings } from '../controllers/bookingController.js';

const router = Router();

router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getUserBookings);
router.get('/partner-bookings', protect, getPartnerBookings);

export default router;
