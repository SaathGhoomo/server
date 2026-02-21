import { Router } from 'express';
import { registerUser, loginUser, getProfile, googleLogin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validationRules, validate } from '../middlewares/validate.js';

const router = Router();

router.post('/register', validate(validationRules.register), registerUser);
router.post('/login', validate(validationRules.login), loginUser);
router.post('/google', googleLogin);
router.get('/profile', protect, getProfile);

export default router;
