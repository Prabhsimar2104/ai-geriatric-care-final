import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isLoggedIn } from '../services/auth';
import PushNotificationSetup from '../components/PushNotificationSetup';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏥 AI Geriatric Care Dashboard</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.welcomeCard}>
        <h2 style={styles.welcomeTitle}>Welcome, {user.name}! 👋</h2>
        <div style={styles.userInfo}>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role === 'elderly' ? '👴 Elderly User' : '🩺 Caregiver'}</p>
          <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
          <p><strong>Language:</strong> {user.preferred_language}</p>
        </div>
      </div>

      <PushNotificationSetup />

      <div style={styles.grid}>
        <div style={styles.card} onClick={() => navigate('/reminders')}>
        <h3>💊 Reminders</h3>
        <p>Medicine and activity reminders</p>
        <button style={styles.cardButton}>Go to Reminders →</button>
        </div>

        <div style={styles.card} onClick={() => navigate('/chat')}>
        <h3>💬 AI Chat</h3>
        <p>Talk to AI assistant</p>
        <button style={styles.cardButton}>Go to Chat →</button>
      </div>

        <div style={styles.card} onClick={() => navigate('/fall-alerts')}>
          <h3>🚨 Fall Alerts</h3>
          <p>Emergency notifications</p>
          <button style={styles.cardButton}>View Fall Alerts →</button>
        </div>


        <div style={styles.card}>
          <h3>⚙️ Settings</h3>
          <p>Account settings</p>
          <p style={styles.comingSoon}>Coming soon</p>
        </div>
      </div>

      <div style={styles.statusCard}>
        <h3>✅ Step 3 Complete!</h3>
        <p>Authentication system is working:</p>
        <ul style={styles.list}>
          <li>✅ User signup</li>
          <li>✅ User login</li>
          <li>✅ JWT authentication</li>
          <li>✅ Protected dashboard</li>
        </ul>
        <p style={styles.nextStep}>Ready for Step 4: Reminders System</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  title: {
    color: '#333',
    fontSize: '28px',
    margin: 0
  },
  logoutBtn: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  welcomeCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  welcomeTitle: {
    color: '#333',
    marginBottom: '20px'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    color: '#666'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  card: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  comingSoon: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: '10px',
    fontSize: '14px'
  },
  statusCard: {
    backgroundColor: '#d4edda',
    padding: '25px',
    borderRadius: '12px',
    border: '2px solid #c3e6cb'
  },
  list: {
    marginTop: '15px',
    marginBottom: '15px',
    paddingLeft: '20px'
  },
  nextStep: {
    fontWeight: 'bold',
    color: '#155724',
    marginTop: '15px'
  },
  cardButton: {
  marginTop: '10px',
  padding: '8px 16px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '600'
  }
};

export default Dashboard;