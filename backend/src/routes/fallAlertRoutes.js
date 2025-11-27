// backend/src/routes/fallAlertRoutes.js
import express from 'express';
import {
  receiveFallAlert,
  getFallAlerts,
  acknowledgeFallAlert
} from '../controllers/fallAlerts.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = express.Router();

// Middleware to verify API key for Python script
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  
  if (apiKey !== process.env.FALL_ALERT_TOKEN) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Public endpoint for Python script (protected by API key)
router.post('/fall-alert', verifyApiKey, receiveFallAlert);

// Protected endpoints (require JWT authentication)
router.use(verifyToken);

router.get('/fall-alerts', getFallAlerts);
router.put('/fall-alerts/:id/acknowledge', acknowledgeFallAlert);

export default router;