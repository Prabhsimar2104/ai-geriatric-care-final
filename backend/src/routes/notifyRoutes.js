// backend/src/routes/notifyRoutes.js
import express from 'express';
import {
  getActiveReminders,
  getReminderEvents,
  testNotification,
  savePushSubscription,
  getVapidPublicKey,
  testEmail,
  testSMS,
  getNotificationLogs
} from '../controllers/notify.js';
import {
  receiveFallAlert,
  getFallAlerts,
  acknowledgeFallAlert
} from '../controllers/fallAlerts.js';
import { verifyToken } from '../middleware/authJwt.js';
import { verifyFallDetectionToken } from '../middleware/verifyFallToken.js';

const router = express.Router();

// Public route for VAPID key
router.get('/vapid-public-key', getVapidPublicKey);

// ========================================
// FALL DETECTION WEBHOOK (Protected by API Key)
// ========================================
router.post('/fall-alert', verifyFallDetectionToken, receiveFallAlert);

// ========================================
// AUTHENTICATED ROUTES (Protected by JWT)
// ========================================
router.use(verifyToken);

// Existing reminder notification routes
router.get('/active', getActiveReminders);
router.get('/events', getReminderEvents);
router.post('/test', testNotification);
router.post('/subscribe', savePushSubscription);

// Email/SMS testing routes
router.post('/test-email', testEmail);
router.post('/test-sms', testSMS);

// Notification logs route
router.get('/logs', getNotificationLogs);

// Fall alert management routes (for caregivers)
router.get('/fall-alerts', getFallAlerts);
router.put('/fall-alerts/:id/acknowledge', acknowledgeFallAlert);

export default router;