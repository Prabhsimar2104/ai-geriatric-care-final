// frontend/src/pages/FallAlerts.jsx
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, User, Calendar, Image as ImageIcon } from 'lucide-react';

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
      
      const response = await fetch(`http://localhost:4000/api/notify/fall-alerts${acknowledgedParam}`, {
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
      
      const response = await fetch(`http://localhost:4000/api/notify/fall-alerts/${alertId}/acknowledge`, {
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
          <p className="text-gray-600">Loading fall alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={32} />
            Fall Detection Alerts
          </h1>
          <p className="text-gray-600 mt-2">Monitor and respond to fall detection events</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'unacknowledged'
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unacknowledged ({alerts.filter(a => !a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'acknowledged'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Acknowledged ({alerts.filter(a => a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
          </div>
        </div>

        {/* Alerts List */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Fall Alerts</h3>
            <p className="text-gray-600">
              {filter === 'unacknowledged' 
                ? 'All fall alerts have been acknowledged.'
                : 'There are no fall alerts to display.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const severity = getAlertSeverity(alert.timestamp, alert.acknowledged);
              const severityColors = {
                critical: 'border-red-500 bg-red-50',
                high: 'border-orange-500 bg-orange-50',
                medium: 'border-yellow-500 bg-yellow-50',
                resolved: 'border-green-500 bg-green-50'
              };

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 p-6 ${severityColors[severity]} hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Alert Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle 
                          className={alert.acknowledged ? 'text-green-600' : 'text-red-600'} 
                          size={24} 
                        />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Fall Detected - {alert.user_name || 'Unknown User'}
                        </h3>
                        {!alert.acknowledged && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full animate-pulse">
                            URGENT
                          </span>
                        )}
                      </div>

                      {/* Alert Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} />
                          <span>{formatTimestamp(alert.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={16} />
                          <span>{alert.user_email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={16} />
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Confidence Score */}
                      {alert.confidence && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-600">Detection Confidence:</span>
                            <span className="text-sm font-medium">{(alert.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${alert.confidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Acknowledged Info */}
                      {alert.acknowledged && (
                        <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-100 px-3 py-2 rounded-md">
                          <CheckCircle size={16} />
                          <span className="text-sm">
                            Acknowledged by {alert.acknowledged_by_name} at {new Date(alert.acknowledged_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {!alert.acknowledged && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeAlert(alert.id);
                        }}
                        className="ml-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>

                  {/* Image Preview */}
                  {alert.image_url && (
                    <div className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700">
                      <ImageIcon size={16} />
                      <span className="text-sm font-medium">View fall detection image →</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedAlert(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Fall Alert Details</h2>
            
            <div className="space-y-3 mb-6">
              <p><strong>User:</strong> {selectedAlert.user_name} ({selectedAlert.user_email})</p>
              <p><strong>Time:</strong> {new Date(selectedAlert.timestamp).toLocaleString()}</p>
              <p><strong>Confidence:</strong> {selectedAlert.confidence ? `${(selectedAlert.confidence * 100).toFixed(1)}%` : 'N/A'}</p>
              <p><strong>Status:</strong> {selectedAlert.acknowledged ? 'Acknowledged' : 'Pending'}</p>
              
              {selectedAlert.acknowledged && (
                <>
                  <p><strong>Acknowledged By:</strong> {selectedAlert.acknowledged_by_name}</p>
                  <p><strong>Acknowledged At:</strong> {new Date(selectedAlert.acknowledged_at).toLocaleString()}</p>
                </>
              )}
            </div>

            {selectedAlert.image_url && (
              <div className="mb-6">
                <img src={selectedAlert.image_url} alt="Fall detection" className="w-full rounded-lg" />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
              {!selectedAlert.acknowledged && (
                <button
                  onClick={() => acknowledgeAlert(selectedAlert.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Acknowledge Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}