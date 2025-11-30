import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isLoggedIn } from '../services/auth';
import PushNotificationSetup from '../components/PushNotificationSetup';
import Layout from '../components/Layout';
import { Bell, Activity, MessageSquare, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  return (
    <Layout title="Dashboard">
      <div className="animate-fade-in">
        {/* Hero Section */}
        <div className="relative mb-12 overflow-hidden rounded-2xl">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 animate-gradient"></div>

          {/* Starfield */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="star" style={{ top: '10%', left: '20%' }}></div>
            <div className="star" style={{ top: '30%', left: '60%' }}></div>
            <div className="star" style={{ top: '50%', left: '15%' }}></div>
            <div className="star" style={{ top: '70%', left: '80%' }}></div>
            <div className="star" style={{ top: '20%', left: '85%' }}></div>
            <div className="star" style={{ top: '60%', left: '40%' }}></div>
            <div className="star" style={{ top: '80%', left: '25%' }}></div>
            <div className="star" style={{ top: '40%', left: '70%' }}></div>
          </div>

          {/* Gradient Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

          {/* Hero Content */}
          <div className="relative z-10 p-12 text-center">
            <h1 className="text-5xl font-bold text-white mb-4">
              AI Geriatric Care Dashboard
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Comprehensive health monitoring and care management for elderly patients
            </p>

            {/* User Welcome Card */}
            <div className="glass-panel max-w-2xl mx-auto p-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-white">
                    Welcome back, <span className="text-gradient">{user?.name || 'User'}</span>!
                  </h2>
                  <div className="flex items-center gap-3 text-slate-400 mt-1">
                    <span className="badge badge-primary">{user?.role || 'Caregiver'}</span>
                    <span>•</span>
                    <span>{user?.email}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <PushNotificationSetup />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Overview - Stat Cards */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp className="text-primary" size={28} />
            Today's Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Upcoming Reminders */}
            <div className="card bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Bell className="text-blue-400" size={24} />
                </div>
                <span className="text-3xl font-bold text-blue-400">5</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Upcoming Reminders</h3>
              <p className="text-slate-400 text-sm">Due in next 24 hours</p>
            </div>

            {/* Unread Fall Alerts */}
            <div className="card bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/40 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertCircle className="text-red-400" size={24} />
                </div>
                <span className="text-3xl font-bold text-red-400">2</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Unread Alerts</h3>
              <p className="text-slate-400 text-sm">Require attention</p>
            </div>

            {/* Last Fall Event */}
            <div className="card bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:border-orange-500/40 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Activity className="text-orange-400" size={24} />
                </div>
                <span className="text-2xl font-bold text-orange-400">2d</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Last Fall Event</h3>
              <p className="text-slate-400 text-sm">2 days ago</p>
            </div>

            {/* Chat Activity */}
            <div className="card bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <MessageSquare className="text-purple-400" size={24} />
                </div>
                <span className="text-3xl font-bold text-purple-400">12</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Chat Messages</h3>
              <p className="text-slate-400 text-sm">This week</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Reminders */}
            <div
              onClick={() => navigate('/reminders')}
              className="card hover:border-primary/50 transition-all cursor-pointer group hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Bell size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white">Reminders</h3>
              </div>
              <p className="text-slate-400">Manage medication schedules and appointments.</p>
            </div>

            {/* Fall Alerts */}
            <div
              onClick={() => navigate('/fall-alerts')}
              className="card hover:border-red-500/50 transition-all cursor-pointer group hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white">Fall Alerts</h3>
              </div>
              <p className="text-slate-400">Monitor fall detection events and alerts.</p>
            </div>

            {/* AI Chat */}
            <div
              onClick={() => navigate('/chat')}
              className="card hover:border-purple-500/50 transition-all cursor-pointer group hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white">AI Chat</h3>
              </div>
              <p className="text-slate-400">Chat with the AI assistant for help and info.</p>
            </div>

            {/* ⭐ NEW FALL DETECTION BUTTON ⭐ */}
            <div
              onClick={() =>
                window.open(
                  "https://fall-detection-final-hhfcbskbhyappcxen8dapzr.streamlit.app/",
                  "_blank"
                )
              }
              className="card hover:border-indigo-500/50 transition-all cursor-pointer group hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white">Fall Detection</h3>
              </div>
              <p className="text-slate-400">Open real-time AI fall detection system.</p>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="card border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="text-lg font-semibold text-green-400">System Status</h3>
          </div>
          <p className="text-green-400/80 mt-2 ml-5">All systems are running normally. Monitoring active.</p>
        </div>
      </div>
    </Layout>
  );
}
