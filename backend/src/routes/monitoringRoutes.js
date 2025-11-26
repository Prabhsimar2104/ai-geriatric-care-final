import express from 'express';
import { getHealthStatus } from '../utils/healthCheck.js';
import { verifyToken } from '../middleware/authJwt.js';
import db from '../db.js';

const router = express.Router();

// Public health check
router.get('/health', async (req, res) => {
  const health = await getHealthStatus();
  res.json(health);
});

// Protected monitoring endpoints
router.use(verifyToken);

// System stats
router.get('/stats', async (req, res) => {
  try {
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'elderly' THEN 1 ELSE 0 END) as elderly_count,
        SUM(CASE WHEN role = 'caregiver' THEN 1 ELSE 0 END) as caregiver_count
      FROM users
    `);

    const [fallStats] = await db.query(`
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN acknowledged = 1 THEN 1 ELSE 0 END) as acknowledged,
        SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending,
        AVG(confidence) as avg_confidence
      FROM fall_alerts
    `);

    const [notificationStats] = await db.query(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM notification_logs
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY type
    `);

    res.json({
      users: userStats[0],
      fallAlerts: fallStats[0],
      notifications: notificationStats
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;