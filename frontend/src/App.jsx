import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { isLoggedIn } from './services/auth';
import Reminders from './pages/Reminders';
import ReminderNotification from './components/ReminderNotification';
import Chat from './pages/Chat';
import FallAlerts from "./pages/FallAlerts";


function App() {
  return (
    <Router>
      <ReminderNotification />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/" element={<Navigate to={isLoggedIn() ? "/dashboard" : "/login"} />} />
        <Route path="/fall-alerts" element={<FallAlerts />} />
      </Routes>
    </Router>
  );
}

export default App;