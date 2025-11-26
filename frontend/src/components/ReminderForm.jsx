import React, { useState, useEffect } from 'react';

function ReminderForm({ onSubmit, onCancel, initialData }) {
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    time: '',
    repeat_type: 'daily',
    enabled: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        notes: initialData.notes || '',
        time: initialData.time || '',
        repeat_type: initialData.repeat_type || 'daily',
        enabled: initialData.enabled === 1
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      enabled: formData.enabled ? 1 : 0
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Title *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          style={styles.input}
          placeholder="e.g., Take blood pressure medicine"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
          placeholder="Additional notes (optional)"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Time *</label>
        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Repeat</label>
        <select
          name="repeat_type"
          value={formData.repeat_type}
          onChange={handleChange}
          style={styles.input}
        >
          <option value="none">One time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div style={styles.checkboxGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="enabled"
            checked={formData.enabled}
            onChange={handleChange}
            style={styles.checkbox}
          />
          <span>Enable this reminder</span>
        </label>
      </div>

      <div style={styles.buttonGroup}>
        <button type="submit" style={styles.submitBtn}>
          {initialData ? 'Update Reminder' : 'Create Reminder'}
        </button>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit'
  },
  checkboxGroup: {
    marginTop: '8px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px'
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default ReminderForm;