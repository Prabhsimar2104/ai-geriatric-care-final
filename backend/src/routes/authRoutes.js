import express from 'express';
import { signup, login, getMe } from '../controllers/auth.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', verifyToken, getMe);

export default router;