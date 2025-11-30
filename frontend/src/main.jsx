import * as Sentry from "@sentry/react";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// import LogRocket from 'logrocket';

/* ---------------------- 🔥 SENTRY INIT ---------------------- */
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,               // Performance monitoring
  replaysSessionSampleRate: 0.1,       // Session replay sample rate
  replaysOnErrorSampleRate: 1.0        // Record replay when an error happens
});

/* ---------------------- 🔥 LOGROCKET INIT ---------------------- */
// if (import.meta.env.PROD) {
//   // Replace 'your-app-id' with your real LogRocket project ID
//   LogRocket.init('your-app-id');

//   // Identify user (placeholder data — replace dynamically later)
//   LogRocket.identify('USER_ID', {
//     name: 'User Name',
//     email: 'user@example.com',
//     role: 'caregiver',
//   });
// }

/* ---------------------- 🚀 REACT ROOT ------------------------ */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
