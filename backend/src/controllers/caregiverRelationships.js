// backend/src/controllers/caregiverRelationships.js
import db from '../db.js';

/**
 * POST /api/relationships/assign
 * Assign a caregiver to an elderly user
 */
export const assignCaregiver = async (req, res) => {
  try {
    const { caregiverId, elderlyId, relationshipType, isPrimary, permissions } = req.body;
    const assignedBy = req.userId; // From JWT

    // Validate required fields
    if (!caregiverId || !elderlyId) {
      return res.status(400).json({ error: 'caregiverId and elderlyId are required' });
    }

    // Verify caregiver exists and has correct role
    const [caregiver] = await db.query(
      'SELECT id, role FROM users WHERE id = ? AND role = "caregiver"',
      [caregiverId]
    );

    if (caregiver.length === 0) {
      return res.status(404).json({ error: 'Caregiver not found or invalid role' });
    }

    // Verify elderly user exists
    const [elderly] = await db.query(
      'SELECT id, role FROM users WHERE id = ? AND role = "elderly"',
      [elderlyId]
    );

    if (elderly.length === 0) {
      return res.status(404).json({ error: 'Elderly user not found or invalid role' });
    }

    // Check if relationship already exists
    const [existing] = await db.query(
      'SELECT id FROM caregiver_elderly_relationships WHERE caregiver_id = ? AND elderly_id = ?',
      [caregiverId, elderlyId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Relationship already exists' });
    }

    // Default permissions
    const defaultPermissions = {
      can_acknowledge_falls: true,
      can_modify_reminders: true,
      can_view_chat_history: true,
      can_manage_emergency_contacts: false
    };

    const finalPermissions = permissions || defaultPermissions;

    // Insert relationship
    const [result] = await db.query(
      `INSERT INTO caregiver_elderly_relationships 
       (caregiver_id, elderly_id, relationship_type, is_primary, permissions, assigned_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        caregiverId,
        elderlyId,
        relationshipType || 'professional',
        isPrimary || 0,
        JSON.stringify(finalPermissions),
        assignedBy
      ]
    );

    res.status(201).json({
      message: 'Caregiver assigned successfully',
      relationshipId: result.insertId,
      relationship: {
        id: result.insertId,
        caregiverId,
        elderlyId,
        relationshipType: relationshipType || 'professional',
        isPrimary: isPrimary || 0,
        permissions: finalPermissions
      }
    });

  } catch (error) {
    console.error('Error assigning caregiver:', error);
    res.status(500).json({ error: 'Failed to assign caregiver', message: error.message });
  }
};

/**
 * DELETE /api/relationships/:relationshipId
 * Remove a caregiver relationship
 */
export const removeCaregiver = async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const [result] = await db.query(
      'DELETE FROM caregiver_elderly_relationships WHERE id = ?',
      [relationshipId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    res.json({ message: 'Caregiver relationship removed successfully' });

  } catch (error) {
    console.error('Error removing caregiver:', error);
    res.status(500).json({ error: 'Failed to remove caregiver', message: error.message });
  }
};

/**
 * GET /api/relationships/caregiver/:caregiverId/elderly
 * Get all elderly users assigned to a caregiver
 */
export const getElderlyForCaregiver = async (req, res) => {
  try {
    const { caregiverId } = req.params;

    const [relationships] = await db.query(
      `SELECT 
        r.id as relationship_id,
        r.relationship_type,
        r.is_primary,
        r.permissions,
        r.assigned_at,
        r.status,
        u.id as elderly_id,
        u.name as elderly_name,
        u.email as elderly_email,
        u.phone as elderly_phone,
        u.preferred_language
      FROM caregiver_elderly_relationships r
      JOIN users u ON r.elderly_id = u.id
      WHERE r.caregiver_id = ? AND r.status = 'active'
      ORDER BY r.is_primary DESC, u.name ASC`,
      [caregiverId]
    );

    // Parse JSON permissions
    const parsedRelationships = relationships.map(rel => ({
      ...rel,
      permissions: typeof rel.permissions === 'string' ? JSON.parse(rel.permissions) : rel.permissions
    }));

    res.json({
      success: true,
      count: parsedRelationships.length,
      relationships: parsedRelationships
    });

  } catch (error) {
    console.error('Error fetching elderly for caregiver:', error);
    res.status(500).json({ error: 'Failed to fetch elderly users', message: error.message });
  }
};

/**
 * GET /api/relationships/elderly/:elderlyId/caregivers
 * Get all caregivers assigned to an elderly user
 */
export const getCaregiversForElderly = async (req, res) => {
  try {
    const { elderlyId } = req.params;

    const [relationships] = await db.query(
      `SELECT 
        r.id as relationship_id,
        r.relationship_type,
        r.is_primary,
        r.permissions,
        r.assigned_at,
        r.status,
        u.id as caregiver_id,
        u.name as caregiver_name,
        u.email as caregiver_email,
        u.phone as caregiver_phone
      FROM caregiver_elderly_relationships r
      JOIN users u ON r.caregiver_id = u.id
      WHERE r.elderly_id = ? AND r.status = 'active'
      ORDER BY r.is_primary DESC, u.name ASC`,
      [elderlyId]
    );

    // Parse JSON permissions
    const parsedRelationships = relationships.map(rel => ({
      ...rel,
      permissions: typeof rel.permissions === 'string' ? JSON.parse(rel.permissions) : rel.permissions
    }));

    res.json({
      success: true,
      count: parsedRelationships.length,
      relationships: parsedRelationships
    });

  } catch (error) {
    console.error('Error fetching caregivers for elderly:', error);
    res.status(500).json({ error: 'Failed to fetch caregivers', message: error.message });
  }
};

/**
 * PUT /api/relationships/:relationshipId
 * Update relationship details
 */
export const updateRelationship = async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { relationshipType, isPrimary, permissions, status, notes } = req.body;

    const updates = [];
    const values = [];

    if (relationshipType) {
      updates.push('relationship_type = ?');
      values.push(relationshipType);
    }
    if (isPrimary !== undefined) {
      updates.push('is_primary = ?');
      values.push(isPrimary);
    }
    if (permissions) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(relationshipId);

    const [result] = await db.query(
      `UPDATE caregiver_elderly_relationships SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    res.json({ message: 'Relationship updated successfully' });

  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ error: 'Failed to update relationship', message: error.message });
  }
};

export default {
  assignCaregiver,
  removeCaregiver,
  getElderlyForCaregiver,
  getCaregiversForElderly,
  updateRelationship
};