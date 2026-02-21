import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import testRoutes from './routes/testRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import { authorizeRoles } from './middleware/roleMiddleware.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Running');
});

app.get('/api/protected', protect, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

app.get(
  '/api/admin-only',
  protect,
  authorizeRoles('admin'),
  (req, res) => {
    res.json({ success: true, message: 'Admin access granted' });
  }
);

app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

