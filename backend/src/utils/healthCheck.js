import db from '../db.js';
import os from 'os';

export async function getHealthStatus() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024),
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    services: {}
  };

  // Check database
  try {
    await db.query('SELECT 1');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'unhealthy';
  }

  // Check recent fall alerts
  try {
    const [recentAlerts] = await db.query(
      'SELECT COUNT(*) as count FROM fall_alerts WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );
    health.services.fallAlerts = {
      last24h: recentAlerts[0].count
    };
  } catch (error) {
    health.services.fallAlerts = 'error';
  }

  // Check notification system
  try {
    const [recentNotifications] = await db.query(
      'SELECT COUNT(*) as sent, SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed FROM notification_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );
    health.services.notifications = {
      lastHour: recentNotifications[0].sent,
      failed: recentNotifications[0].failed
    };
  } catch (error) {
    health.services.notifications = 'error';
  }

  return health;
}