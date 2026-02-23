import { Router } from 'express';
import { validate, schemas } from '../middlewares/validationMiddleware.js';
import { validationRules } from '../middlewares/validate.js';
import { registerUser, loginUser, getProfile, googleLogin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', validate(schemas.register), registerUser);
router.post('/login', validate(schemas.login), loginUser);
router.post('/login', validate(validationRules.login), loginUser);
router.post('/google', googleLogin);
router.get('/profile', protect, getProfile);

export default router;
