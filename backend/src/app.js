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

// New imports
import { getHealthStatus } from './utils/healthCheck.js';
import { performanceMonitoring } from './middleware/performance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/* ---------------------- 🔥 SENTRY INITIALIZATION 🔥 ---------------------- */

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Must be before routes
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

/* ---------------------- 🌐 EXPRESS MIDDLEWARE ---------------------------- */

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ai-geriatric-care-m73p.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------------- 🚀 PERFORMANCE MONITORING ------------------------ */

app.use(performanceMonitoring);

/* ---------------------- 🩺 HEALTH CHECK ROUTE ---------------------------- */

app.get('/api/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
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
app.use('/api/reminders', reminderRoutes);
app.use('/api/notify', notifyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);

/* ---------------------- 🏠 HOME ROUTE ----------------------------------- */

app.get('/', (req, res) => {
  res.json({
    message: 'AI Geriatric Care API',
    version: '1.0.0',
    status: 'Running'
  });
});

/* ---------------------- ❌ 404 HANDLER ---------------------------------- */

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ---------------------- 🔥 SENTRY ERROR HANDLER -------------------------- */

app.use(Sentry.Handlers.errorHandler());

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
});