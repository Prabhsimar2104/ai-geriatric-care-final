import React from 'react';

function ReminderList({ reminders, onEdit, onDelete, onToggle }) {
  if (reminders.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>📝 No reminders yet</p>
        <p style={styles.emptySubtext}>Click "Add Reminder" to create your first reminder</p>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {reminders.map((reminder) => (
        <div key={reminder.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.title}>{reminder.title}</h3>
              <p style={styles.time}>⏰ {formatTime(reminder.time)}</p>
            </div>
            <label style={styles.switch}>
              <input
                type="checkbox"
                checked={reminder.enabled === 1}
                onChange={() => onToggle(reminder.id)}
                style={{ display: 'none' }}
              />
              <span style={{
                ...styles.slider,
                backgroundColor: reminder.enabled === 1 ? '#28a745' : '#ccc'
              }}></span>
            </label>
          </div>

          {reminder.notes && (
            <p style={styles.notes}>{reminder.notes}</p>
          )}

          <div style={styles.meta}>
            <span style={styles.badge}>
              {getRepeatLabel(reminder.repeat_type)}
            </span>
            <span style={{
              ...styles.status,
              color: reminder.enabled === 1 ? '#28a745' : '#6c757d'
            }}>
              {reminder.enabled === 1 ? '✓ Active' : '✗ Disabled'}
            </span>
          </div>

          <div style={styles.actions}>
            <button onClick={() => onEdit(reminder)} style={styles.editBtn}>
              ✏️ Edit
            </button>
            <button onClick={() => onDelete(reminder.id)} style={styles.deleteBtn}>
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper functions
const formatTime = (time) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getRepeatLabel = (type) => {
  const labels = {
    none: '📅 One time',
    daily: '🔄 Daily',
    weekly: '📆 Weekly',
    monthly: '🗓️ Monthly'
  };
  return labels[type] || type;
};

const styles = {
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    color: '#333',
    marginBottom: '6px'
  },
  time: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  notes: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0'
  },
  badge: {
    fontSize: '13px',
    color: '#555'
  },
  status: {
    fontSize: '13px',
    fontWeight: '600'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  editBtn: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  deleteBtn: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '26px',
    cursor: 'pointer'
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '26px',
    transition: '0.3s',
    display: 'flex',
    alignItems: 'center'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px dashed #ddd'
  },
  emptyText: {
    fontSize: '24px',
    marginBottom: '10px',
    color: '#666'
  },
  emptySubtext: {
    color: '#999',
    fontSize: '14px'
  }
};

export default ReminderList;