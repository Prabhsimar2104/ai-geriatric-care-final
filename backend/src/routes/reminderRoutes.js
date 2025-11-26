import express from 'express';
import {
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder
} from '../controllers/reminders.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.get('/', getReminders);
router.get('/:id', getReminderById);
router.post('/', createReminder);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);
router.patch('/:id/toggle', toggleReminder);

export default router;