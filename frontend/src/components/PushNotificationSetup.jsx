import React, { useState, useEffect } from 'react';
import { isSupported, getPermission, subscribeToPush, isSubscribed } from '../services/push';

function PushNotificationSetup() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setSupported(isSupported());
    setPermission(getPermission());
    
    if (isSupported()) {
      const subStatus = await isSubscribed();
      setSubscribed(subStatus);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      await subscribeToPush();
      await checkStatus();
      alert('✅ Push notifications enabled!');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      alert('❌ Failed to enable notifications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div style={styles.card}>
        <p style={styles.warning}>⚠️ Push notifications not supported in this browser</p>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div style={styles.card}>
        <p style={styles.success}>✅ Push notifications are enabled!</p>
        <p style={styles.info}>You'll receive notifications even when this tab is closed.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>🔔 Enable Push Notifications</h3>
      <p style={styles.description}>
        Get reminded even when this tab is in the background or closed.
      </p>
      <button 
        onClick={handleEnableNotifications}
        disabled={loading}
        style={{
          ...styles.button,
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Enabling...' : '🔔 Enable Push Notifications'}
      </button>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#e7f3ff',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '2px solid #90caf9'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#1976d2'
  },
  description: {
    color: '#555',
    marginBottom: '15px'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  success: {
    color: '#2e7d32',
    fontWeight: 'bold',
    margin: '0 0 8px 0'
  },
  info: {
    color: '#555',
    margin: 0,
    fontSize: '14px'
  },
  warning: {
    color: '#f57c00',
    fontWeight: 'bold',
    margin: 0
  }
};

export default PushNotificationSetup;