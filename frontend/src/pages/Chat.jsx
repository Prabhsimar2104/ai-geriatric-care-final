import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';
import ChatWindow from '../components/ChatWindow';

function Chat() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💬 AI Chat</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
            ← Dashboard
          </button>
          <button onClick={logout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      <ChatWindow />
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
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  title: {
    color: '#333',
    fontSize: '28px',
    margin: 0
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  backBtn: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  logoutBtn: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  }
};

export default Chat;