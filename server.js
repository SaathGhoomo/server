import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import morgan from 'morgan';
import connectDB from './config/db.js';
import testRoutes from './routes/testRoutes.js';
import authRoutes from './routes/authRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import earningsRoutes from './routes/earningsRoutes.js';
import premiumRoutes from './routes/premiumRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import { authorizeRoles } from './middleware/roleMiddleware.js';
import errorHandler from './middlewares/errorMiddleware.js';
import { getHealthStatus } from './controllers/healthController.js';
import logger from './utils/logger.js';
import { expirePremiumSubscriptions, cleanupActivityLogs } from './utils/cronJobs.js';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Add your production domain
    : ['http://localhost:8000', 'http://127.0.0.1:8000'],
  credentials: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Mount webhook route BEFORE express.json() middleware
app.use('/api/payments/webhook', paymentRoutes);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Running');
});

// Health check endpoint
app.get('/api/health', getHealthStatus);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments/create-order', authLimiter);

app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/premium', premiumRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  // Start cron jobs
  expirePremiumSubscriptions.start();
  cleanupActivityLogs.start();
  logger.info('Cron jobs started');

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

