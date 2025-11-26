import express from 'express';
import {
  sendMessage,
  getChatHistory,
  clearChatHistory
} from '../controllers/chat.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.post('/message', sendMessage);
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);

export default router;