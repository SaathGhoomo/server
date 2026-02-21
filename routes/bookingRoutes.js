import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createBooking } from '../controllers/bookingController.js';

const router = Router();

router.post('/', protect, createBooking);

export default router;
