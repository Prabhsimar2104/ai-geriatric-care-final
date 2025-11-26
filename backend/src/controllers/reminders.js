import db from '../db.js';

// Get all reminders for current user
export const getReminders = async (req, res) => {
  try {
    const [reminders] = await db.query(
      'SELECT * FROM reminders WHERE user_id = ? ORDER BY time ASC',
      [req.user.id]
    );

    res.json({
      success: true,
      count: reminders.length,
      reminders: reminders
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      error: 'Failed to fetch reminders',
      message: error.message
    });
  }
};

// Get single reminder by ID
export const getReminderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [reminders] = await db.query(
      'SELECT * FROM reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (reminders.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      reminder: reminders[0]
    });

  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({
      error: 'Failed to fetch reminder',
      message: error.message
    });
  }
};

// Create new reminder
export const createReminder = async (req, res) => {
  try {
    const { title, notes, time, repeat_type, enabled } = req.body;

    // Validation
    if (!title || !time) {
      return res.status(400).json({
        error: 'Title and time are required'
      });
    }

    // Insert reminder
    const [result] = await db.query(
      `INSERT INTO reminders (user_id, title, notes, time, repeat_type, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        notes || null,
        time,
        repeat_type || 'daily',
        enabled !== undefined ? enabled : 1
      ]
    );

    // Get the created reminder
    const [newReminder] = await db.query(
      'SELECT * FROM reminders WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      reminder: newReminder[0]
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      error: 'Failed to create reminder',
      message: error.message
    });
  }
};

// Update reminder
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, notes, time, repeat_type, enabled } = req.body;

    // Check if reminder exists and belongs to user
    const [existing] = await db.query(
      'SELECT * FROM reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found'
      });
    }

    // Update reminder
    await db.query(
      `UPDATE reminders 
       SET title = ?, notes = ?, time = ?, repeat_type = ?, enabled = ?
       WHERE id = ? AND user_id = ?`,
      [
        title || existing[0].title,
        notes !== undefined ? notes : existing[0].notes,
        time || existing[0].time,
        repeat_type || existing[0].repeat_type,
        enabled !== undefined ? enabled : existing[0].enabled,
        id,
        req.user.id
      ]
    );

    // Get updated reminder
    const [updated] = await db.query(
      'SELECT * FROM reminders WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      reminder: updated[0]
    });

  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      error: 'Failed to update reminder',
      message: error.message
    });
  }
};

// Delete reminder
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reminder exists and belongs to user
    const [existing] = await db.query(
      'SELECT * FROM reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found'
      });
    }

    // Delete reminder
    await db.query(
      'DELETE FROM reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      error: 'Failed to delete reminder',
      message: error.message
    });
  }
};

// Toggle reminder enabled/disabled
export const toggleReminder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reminder exists and belongs to user
    const [existing] = await db.query(
      'SELECT * FROM reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found'
      });
    }

    // Toggle enabled status
    const newStatus = existing[0].enabled ? 0 : 1;
    
    await db.query(
      'UPDATE reminders SET enabled = ? WHERE id = ? AND user_id = ?',
      [newStatus, id, req.user.id]
    );

    // Get updated reminder
    const [updated] = await db.query(
      'SELECT * FROM reminders WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Reminder ${newStatus ? 'enabled' : 'disabled'}`,
      reminder: updated[0]
    });

  } catch (error) {
    console.error('Toggle reminder error:', error);
    res.status(500).json({
      error: 'Failed to toggle reminder',
      message: error.message
    });
  }
};