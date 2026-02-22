import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
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
import reviewRoutes from './routes/reviewRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import { authorizeRoles } from './middleware/roleMiddleware.js';
import errorHandler from './middlewares/errorMiddleware.js';
import { getHealthStatus } from './controllers/healthController.js';
import logger from './utils/logger.js';
import { expirePremiumSubscriptions, cleanupActivityLogs } from './utils/cronJobs.js';
import { 
  authenticateSocket, 
  handleConnection 
} from './utils/socketHandlers.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    '429': 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://yourdomain.com"] 
    : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV !== 'production' 
      ? ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
      : ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available to controllers
app.set('io', io);

// Socket authentication middleware
io.use(authenticateSocket);

// Socket connection handling
io.on('connection', (socket) => {
  handleConnection(socket, io);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err });
});

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Mount webhook route BEFORE express.json() middleware
app.use('/api/payments/webhook', paymentRoutes);

app.use(express.json());

app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body',
    });
  }

  return next(err);
});

app.get('/', (req, res) => {
  res.send('API Running');
});

// Health check endpoint
app.get('/api/health', getHealthStatus);

// Apply stricter rate limiting to auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments/create-order', authLimiter);

// Express 5 compatibility: req.query is read-only; express-mongo-sanitize reassigns it.
// Make query writable so sanitize can run without throwing.
app.use((req, res, next) => {
  try {
    let obj = req;
    while (obj) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, 'query');
      if (descriptor && !descriptor.writable) {
        const value = req.query;
        Object.defineProperty(req, 'query', {
          value,
          writable: true,
          configurable: true,
          enumerable: descriptor.enumerable !== false
        });
        break;
      }
      obj = Object.getPrototypeOf(obj);
    }
  } catch (_) { /* ignore */ }
  next();
});

// Data sanitization
app.use(mongoSanitize());

// Remove x-powered-by header
app.disable('x-powered-by');

// Only include test routes in development
if (process.env.NODE_ENV === 'development') {
  app.use('/api/test', testRoutes);
}

app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  // Start cron jobs
  expirePremiumSubscriptions.start();
  cleanupActivityLogs.start();
  logger.info('Cron jobs started');

  const PORT = process.env.PORT || 8000;
  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info(`Socket.io server enabled`);
  });
};

startServer();

