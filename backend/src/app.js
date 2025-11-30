import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import db from './db.js';
import { startReminderScheduler } from './utils/scheduler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import notifyRoutes from './routes/notifyRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import emergencyContactRoutes from './routes/emergencyContactRoutes.js';
import fallAlertRoutes from './routes/fallAlertRoutes.js';

// New imports
import { getHealthStatus } from './utils/healthCheck.js';
import { performanceMonitoring } from './middleware/performance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/* ---------------------- 🔥 SENTRY INITIALIZATION 🔥 ---------------------- */

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  // Must be before routes
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

/* ---------------------- 🌐 EXPRESS MIDDLEWARE ---------------------------- */

/* ---------------------- 🌐 EXPRESS MIDDLEWARE ---------------------------- */

// CORS - Simple and direct
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ai-geriatric-care-final-ateo.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------------- 🚀 PERFORMANCE MONITORING ------------------------ */

if (performanceMonitoring) {
  app.use(performanceMonitoring);
}

/* ---------------------- 🩺 HEALTH CHECK ROUTE ---------------------------- */

app.get('/api/health', async (req, res) => {
  try {
    const health = getHealthStatus ? await getHealthStatus() : null;
    
    if (health) {
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } else {
      // Fallback health check
      const [result] = await db.query('SELECT 1 as status');
      res.json({ 
        status: 'OK', 
        message: 'Server running',
        database: result[0].status === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/* ---------------------- 📡 API ROUTES ----------------------------------- */

app.use('/api/auth', authRoutes);
app.use('/api/reminders', reminderRoutes); // ✅ This should work now
app.use('/api/notify', notifyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/fall-alerts', fallAlertRoutes); // ✅ Changed from /api/notify to /api/fall-alerts

/* ---------------------- 🏠 HOME ROUTE ----------------------------------- */

app.get('/', (req, res) => {
  res.json({
    message: 'AI Geriatric Care API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: '/api/health',
      fallAlert: '/api/notify/fall-alert (POST with X-API-KEY)',
      fallAlerts: '/api/notify/fall-alerts (GET with JWT)'
    }
  });
});

/* ---------------------- ❌ 404 HANDLER ---------------------------------- */

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ---------------------- 🔥 SENTRY ERROR HANDLER -------------------------- */

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

/* ---------------------- ⚠️ CUSTOM ERROR HANDLER -------------------------- */

app.use((err, req, res, next) => {
  console.error('⚠️ ERROR:', err.stack);

  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    sentryId: res.sentry // Sentry debugging
  });
});

/* ---------------------- ⏰ SCHEDULER + SERVER ---------------------------- */

startReminderScheduler();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🚨 Fall alert endpoint: http://localhost:${PORT}/api/notify/fall-alert`);
  console.log(`📋 API Key required: ${process.env.FALL_ALERT_TOKEN ? 'Yes ✅' : 'No ⚠️'}`);
});