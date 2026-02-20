import express from 'express';
import { createTestData } from '../controllers/testController.js';

const router = express.Router();

router.post('/', createTestData);

export default router;

