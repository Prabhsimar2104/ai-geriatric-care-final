import db from '../db.js';

// Get all emergency contacts for current user
export const getEmergencyContacts = async (req, res) => {
  try {
    const [contacts] = await db.query(
      'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority ASC',
      [req.user.id]
    );

    res.json({
      success: true,
      contacts: contacts
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      error: 'Failed to fetch emergency contacts',
      message: error.message
    });
  }
};

// Add emergency contact
export const addEmergencyContact = async (req, res) => {
  try {
    const { name, phone, email, relationship, priority } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'Name and phone are required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO emergency_contacts (user_id, name, phone, email, relationship, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, phone, email || null, relationship || null, priority || 1]
    );

    const [newContact] = await db.query(
      'SELECT * FROM emergency_contacts WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Emergency contact added',
      contact: newContact[0]
    });

  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({
      error: 'Failed to add emergency contact',
      message: error.message
    });
  }
};

// Update emergency contact
export const updateEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, relationship, priority } = req.body;

    const [existing] = await db.query(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Emergency contact not found'
      });
    }

    await db.query(
      `UPDATE emergency_contacts 
       SET name = ?, phone = ?, email = ?, relationship = ?, priority = ?
       WHERE id = ? AND user_id = ?`,
      [
        name || existing[0].name,
        phone || existing[0].phone,
        email !== undefined ? email : existing[0].email,
        relationship !== undefined ? relationship : existing[0].relationship,
        priority !== undefined ? priority : existing[0].priority,
        id,
        req.user.id
      ]
    );

    const [updated] = await db.query(
      'SELECT * FROM emergency_contacts WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Emergency contact updated',
      contact: updated[0]
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      error: 'Failed to update emergency contact',
      message: error.message
    });
  }
};

// Delete emergency contact
export const deleteEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Emergency contact not found'
      });
    }

    await db.query(
      'DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Emergency contact deleted'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      error: 'Failed to delete emergency contact',
      message: error.message
    });
  }
};