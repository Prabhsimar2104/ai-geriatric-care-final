import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, logout } from '../services/auth';
import ReminderList from '../components/ReminderList';
import ReminderForm from '../components/ReminderForm';

function Reminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    fetchReminders();
  }, [navigate]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reminders');
      setReminders(response.data.reminders);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      await api.post('/reminders', data);
      setShowForm(false);
      fetchReminders();
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create reminder');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.put(`/reminders/${editingReminder.id}`, data);
      setShowForm(false);
      setEditingReminder(null);
      fetchReminders();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }
    try {
      await api.delete(`/reminders/${id}`);
      fetchReminders();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete reminder');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/reminders/${id}/toggle`);
      fetchReminders();
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Failed to toggle reminder');
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReminder(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💊 My Reminders</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
            ← Dashboard
          </button>
          <button onClick={logout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          ❌ {error}
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} style={styles.addBtn}>
          ➕ Add Reminder
        </button>
      )}

      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
          </h2>
          <ReminderForm
            onSubmit={editingReminder ? handleUpdate : handleCreate}
            onCancel={handleCancel}
            initialData={editingReminder}
          />
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading reminders...</div>
      ) : (
        <ReminderList
          reminders={reminders}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      )}
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
  },
  addBtn: {
    padding: '14px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  formCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  formTitle: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px'
  }
};

export default Reminders;