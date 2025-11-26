import React, { useEffect, useState } from 'react';
import api from '../services/api';

function ReminderNotification() {
  const [notification, setNotification] = useState(null);
  const [checkInterval, setCheckInterval] = useState(null);

  useEffect(() => {
    // Check for active reminders every 30 seconds
    const interval = setInterval(() => {
      checkForActiveReminders();
    }, 30000); // 30 seconds

    setCheckInterval(interval);

    // Check immediately on mount
    checkForActiveReminders();

    // Cleanup
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const checkForActiveReminders = async () => {
    try {
      const response = await api.get('/notify/active');
      
      if (response.data.reminders && response.data.reminders.length > 0) {
        // Show notification for the first active reminder
        const reminder = response.data.reminders[0];
        showNotification(reminder);
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  };

  const showNotification = (reminder) => {
    setNotification(reminder);

    // Play notification sound (optional)
    playNotificationSound();

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setNotification(null);
    }, 10000);
  };

  const playNotificationSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  if (!notification) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.notification}>
        <div style={styles.header}>
          <span style={styles.icon}>🔔</span>
          <h2 style={styles.title}>Reminder!</h2>
          <button onClick={dismissNotification} style={styles.closeBtn}>
            ✕
          </button>
        </div>
        
        <div style={styles.content}>
          <h3 style={styles.reminderTitle}>{notification.title}</h3>
          {notification.notes && (
            <p style={styles.notes}>{notification.notes}</p>
          )}
          <p style={styles.time}>⏰ {notification.time}</p>
        </div>

        <div style={styles.actions}>
          <button onClick={dismissNotification} style={styles.dismissBtn}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease-in'
  },
  notification: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '90%',
    animation: 'slideIn 0.3s ease-out'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 20px 10px 20px',
    borderBottom: '2px solid #f0f0f0'
  },
  icon: {
    fontSize: '32px',
    animation: 'ring 1s ease-in-out infinite'
  },
  title: {
    flex: 1,
    margin: 0,
    color: '#333',
    fontSize: '24px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '4px 8px'
  },
  content: {
    padding: '20px'
  },
  reminderTitle: {
    margin: '0 0 12px 0',
    color: '#007bff',
    fontSize: '20px'
  },
  notes: {
    color: '#666',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  time: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  actions: {
    padding: '10px 20px 20px 20px',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  dismissBtn: {
    padding: '12px 32px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default ReminderNotification;