// frontend/src/pages/FallAlerts.jsx
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, User, Calendar, Image as ImageIcon, X, Zap } from 'lucide-react';
import Layout from '../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function FallAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('unacknowledged'); // 'all', 'unacknowledged', 'acknowledged'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Fetch fall alerts
  useEffect(() => {
    fetchAlerts();
    // Set up polling every 10 seconds for real-time updates
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const acknowledgedParam = filter === 'all' ? '' : `?acknowledged=${filter === 'acknowledged'}`;

      const response = await fetch(`${API_URL}/api/notify/fall-alerts${acknowledgedParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data.alerts || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/notify/fall-alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');

      // Refresh alerts
      fetchAlerts();
      setSelectedAlert(null);

      // Show success message
      alert('Fall alert acknowledged successfully!');
    } catch (err) {
      alert('Error acknowledging alert: ' + err.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hour${Math.floor(diffMinutes / 60) > 1 ? 's' : ''} ago`;

    return date.toLocaleString();
  };

  const getAlertSeverity = (timestamp, acknowledged) => {
    if (acknowledged) return 'resolved';

    const diffMinutes = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diffMinutes < 5) return 'critical';
    if (diffMinutes < 15) return 'high';
    return 'medium';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading fall alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Fall Alerts">
      <div className="animate-fade-in">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-danger-light rounded-2xl relative">
                <AlertTriangle className="text-danger" size={36} />
                <div className="absolute inset-0 bg-danger/20 rounded-2xl blur-xl"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Fall Detection Alerts
                </h1>
                <p className="text-slate-400">Real-time monitoring and emergency response</p>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${filter === 'unacknowledged'
                  ? 'bg-danger text-white shadow-lg shadow-danger/30 scale-105'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              🚨 Unacknowledged ({alerts.filter(a => !a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${filter === 'acknowledged'
                  ? 'bg-success text-white shadow-lg shadow-success/30 scale-105'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              ✅ Acknowledged ({alerts.filter(a => a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${filter === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              📋 All Alerts ({alerts.length})
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger-light border-2 border-danger/40 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="text-danger" size={24} />
              <p className="text-danger font-semibold">Error: {error}</p>
            </div>
          )}

          {/* Alerts List */}
          {alerts.length === 0 ? (
            <div className="card text-center py-20 border-dashed border-2 border-slate-700 bg-slate-800/30">
              <CheckCircle className="mx-auto text-success mb-6 opacity-80" size={64} />
              <h3 className="text-2xl font-bold text-white mb-3">No Fall Alerts</h3>
              <p className="text-slate-400 text-lg">
                {filter === 'unacknowledged'
                  ? 'All fall alerts have been acknowledged. Great work!'
                  : 'There are no fall alerts to display.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {alerts.map((alert) => {
                const severity = getAlertSeverity(alert.timestamp, alert.acknowledged);

                // Neon glow styles based on severity
                const glowStyles = {
                  critical: {
                    border: '3px solid #ef4444',
                    boxShadow: '0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.1)',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)'
                  },
                  high: {
                    border: '2px solid #f59e0b',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
                    background: 'rgba(245, 158, 11, 0.05)'
                  },
                  medium: {
                    border: '2px solid #0ea5e9',
                    boxShadow: '0 0 15px rgba(14, 165, 233, 0.2)',
                    background: 'rgba(14, 165, 233, 0.05)'
                  },
                  resolved: {
                    border: '2px solid #22c55e',
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.2)',
                    background: 'rgba(34, 197, 94, 0.05)',
                    opacity: 0.7
                  }
                };

                return (
                  <div
                    key={alert.id}
                    className="rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden"
                    style={glowStyles[severity]}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    {/* Animated pulse for critical alerts */}
                    {severity === 'critical' && (
                      <div className="absolute inset-0 animate-pulse bg-danger/5 pointer-events-none"></div>
                    )}

                    <div className="flex items-start gap-6 relative z-10">
                      {/* Large Icon on Left */}
                      <div className={`p-5 rounded-2xl flex-shrink-0 ${alert.acknowledged ? 'bg-success/20' : 'bg-danger/20'
                        }`}>
                        {alert.acknowledged ? (
                          <CheckCircle className="text-success" size={48} />
                        ) : (
                          <AlertTriangle className="text-danger animate-pulse" size={48} />
                        )}
                      </div>

                      {/* Details in Middle */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-2xl font-bold text-white">
                            Fall Detected - {alert.user_name || 'Unknown User'}
                          </h3>
                          {!alert.acknowledged && (
                            <span className="px-3 py-1 bg-danger text-white text-xs font-bold rounded-full animate-pulse flex items-center gap-1">
                              <Zap size={12} />
                              URGENT
                            </span>
                          )}
                        </div>

                        {/* Alert Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Clock size={18} className="text-primary" />
                            <span className="font-medium">{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <User size={18} className="text-primary" />
                            <span className="font-medium">{alert.user_email || 'No email'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Calendar size={18} className="text-primary" />
                            <span className="font-medium">{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Confidence Score */}
                        {alert.confidence && (
                          <div className="mb-4 max-w-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-slate-300">DETECTION CONFIDENCE</span>
                              <span className="text-lg font-bold text-primary">{(alert.confidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${alert.confidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Acknowledged Info */}
                        {alert.acknowledged && (
                          <div className="flex items-center gap-2 text-success bg-success-light px-4 py-2 rounded-lg inline-flex">
                            <CheckCircle size={18} />
                            <span className="text-sm font-semibold">
                              Acknowledged by {alert.acknowledged_by_name} at {new Date(alert.acknowledged_at).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* Image Thumbnail */}
                        {alert.image_url && (
                          <div className="mt-4 flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-semibold">
                            <ImageIcon size={18} />
                            <span className="text-sm">Click to view fall detection image →</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button on Right */}
                      {!alert.acknowledged && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeAlert(alert.id);
                          }}
                          className="btn btn-success px-6 py-3 text-base font-bold shadow-lg shadow-success/30 hover:scale-105"
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alert Detail Modal with Image */}
        {selectedAlert && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={() => setSelectedAlert(null)}
          >
            <div
              className="glass-panel max-w-4xl w-full p-8 shadow-2xl border-2 border-white/20 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedAlert(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl font-bold text-white mb-6">Fall Alert Details</h2>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-5 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">User</p>
                  <p className="text-xl font-bold text-white">{selectedAlert.user_name}</p>
                  <p className="text-sm text-slate-400 mt-1">{selectedAlert.user_email}</p>
                </div>
                <div className="p-5 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Time</p>
                  <p className="text-lg font-semibold text-white">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
                </div>
                <div className="p-5 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Status</p>
                  <span className={`badge text-base px-4 py-2 ${selectedAlert.acknowledged ? 'badge-success' : 'badge-danger'}`}>
                    {selectedAlert.acknowledged ? '✓ Acknowledged' : '⚠ Pending Action'}
                  </span>
                </div>
                <div className="p-5 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Confidence</p>
                  <p className="text-xl font-bold text-primary">
                    {selectedAlert.confidence ? `${(selectedAlert.confidence * 100).toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedAlert.acknowledged && (
                <div className="p-5 bg-success-light/10 border-2 border-success/30 rounded-xl mb-8">
                  <p className="text-success font-semibold">
                    <strong>Acknowledged By:</strong> {selectedAlert.acknowledged_by_name} <br />
                    <strong>At:</strong> {new Date(selectedAlert.acknowledged_at).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedAlert.image_url && (
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-400 mb-4 uppercase">Detection Image</p>
                  <img
                    src={selectedAlert.image_url}
                    alt="Fall detection"
                    className="w-full rounded-2xl border-2 border-white/10 shadow-2xl"
                  />
                </div>
              )}

              <div className="flex gap-4 justify-end pt-6 border-t-2 border-white/10">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="btn btn-ghost px-6 py-3"
                >
                  Close
                </button>
                {!selectedAlert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(selectedAlert.id)}
                    className="btn btn-success px-6 py-3 shadow-lg shadow-success/30"
                  >
                    ✓ Acknowledge Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}