// backend/src/controllers/fallAlerts.js
import db from '../db.js';
import { sendPushToUser, sendEmailAlert, sendSMSAlert } from '../utils/notificationService.js';

/**
 * POST /api/notify/fall-alert
 * Receives fall detection alert from Python CV system
 * Protected by X-API-KEY header
 */
export const receiveFallAlert = async (req, res) => {
  try {
    const { userId, timestamp, confidence, imageUrl } = req.body;

    // Validate required fields
    if (!userId || !timestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and timestamp are required' 
      });
    }

    // Insert fall alert into database
    const [result] = await db.query(
      `INSERT INTO fall_alerts (user_id, timestamp, confidence, image_url, acknowledged) 
       VALUES (?, ?, ?, ?, 0)`,
      [userId, timestamp, confidence || null, imageUrl || null]
    );

    const fallAlertId = result.insertId;

    // Get elderly user details
    const [elderlyUser] = await db.query(
      'SELECT name, email, phone FROM users WHERE id = ? AND role = "elderly"',
      [userId]
    );

    if (elderlyUser.length === 0) {
      return res.status(404).json({ error: 'Elderly user not found' });
    }

    const elderly = elderlyUser[0];

    // Get all caregivers assigned to this elderly user
    const [caregivers] = await db.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone, r.permissions
       FROM users u
       JOIN caregiver_elderly_relationships r ON u.id = r.caregiver_id
       WHERE r.elderly_id = ? AND r.status = 'active' AND u.role = 'caregiver'
       ORDER BY r.is_primary DESC`,
      [userId]
    );

    // If no assigned caregivers, fall back to all caregivers (backward compatibility)
    if (caregivers.length === 0) {
      console.warn(`No assigned caregivers for elderly user ${userId}, notifying all caregivers`);
      const [allCaregivers] = await db.query(
        'SELECT id, name, email, phone FROM users WHERE role = "caregiver"'
      );
      caregivers.push(...allCaregivers);
    }

    // Get emergency contacts for this user
    const [emergencyContacts] = await db.query(
      'SELECT name, email, phone FROM emergency_contacts WHERE user_id = ? ORDER BY priority ASC',
      [userId]
    );

    // Prepare alert message
    const alertMessage = `🚨 FALL DETECTED!\n\n${elderly.name} may have fallen.\n\nTime: ${new Date(timestamp).toLocaleString()}\nConfidence: ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}\n\nPlease check immediately!`;

    // Send immediate notifications to all caregivers
    const notificationPromises = [];

    // Web Push notifications to caregivers
    for (const caregiver of caregivers) {
      notificationPromises.push(
        sendPushToUser(caregiver.id, {
          title: '🚨 Fall Alert',
          body: `${elderly.name} may have fallen! Please check immediately.`,
          icon: '/fall-alert-icon.png',
          badge: '/badge-icon.png',
          tag: `fall-alert-${fallAlertId}`,
          requireInteraction: true,
          data: {
            type: 'fall-alert',
            fallAlertId,
            userId,
            timestamp
          }
        }).catch(err => console.error(`Push to caregiver ${caregiver.id} failed:`, err))
      );

      // Send immediate email to caregivers
      notificationPromises.push(
        sendEmailAlert(
          caregiver.email,
          '🚨 Fall Alert - Immediate Attention Required',
          alertMessage,
          `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff3cd; border-left: 5px solid #ff0000;">
              <h2 style="color: #d32f2f;">🚨 FALL DETECTED</h2>
              <p><strong>${elderly.name}</strong> may have fallen and requires immediate attention.</p>
              <ul style="line-height: 1.8;">
                <li><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</li>
                <li><strong>Confidence:</strong> ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}</li>
                ${imageUrl ? `<li><strong>Image:</strong> <a href="${imageUrl}">View Image</a></li>` : ''}
              </ul>
              <p style="margin-top: 20px; padding: 15px; background-color: #ffebee; border-radius: 5px;">
                <strong>Action Required:</strong> Please check on ${elderly.name} immediately or contact emergency services if needed.
              </p>
            </div>
          `
        ).catch(err => console.error(`Email to caregiver ${caregiver.email} failed:`, err))
      );
    }

    // Send email to emergency contacts
    for (const contact of emergencyContacts) {
      if (contact.email) {
        notificationPromises.push(
          sendEmailAlert(
            contact.email,
            '🚨 Fall Alert - Emergency Notification',
            alertMessage,
            `
              <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff3cd; border-left: 5px solid #ff0000;">
                <h2 style="color: #d32f2f;">🚨 EMERGENCY: FALL DETECTED</h2>
                <p>Dear ${contact.name},</p>
                <p><strong>${elderly.name}</strong> may have fallen and requires immediate attention.</p>
                <ul style="line-height: 1.8;">
                  <li><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</li>
                  <li><strong>Confidence:</strong> ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}</li>
                </ul>
                <p style="margin-top: 20px; padding: 15px; background-color: #ffebee; border-radius: 5px;">
                  <strong>Please contact ${elderly.name} immediately or call emergency services.</strong>
                </p>
              </div>
            `
          ).catch(err => console.error(`Email to emergency contact ${contact.email} failed:`, err))
        );
      }
    }

    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);

    // Schedule escalation SMS after delay if not acknowledged
    const smsDelayMinutes = parseInt(process.env.FALL_ALERT_SMS_DELAY_MINUTES) || 10;
    setTimeout(async () => {
      await checkAndEscalateFallAlert(fallAlertId, userId, elderly.name, timestamp, caregivers, emergencyContacts);
    }, smsDelayMinutes * 60 * 1000);

    res.status(201).json({ 
      message: 'Fall alert received and notifications sent',
      fallAlertId,
      notificationsSent: {
        caregivers: caregivers.length,
        emergencyContacts: emergencyContacts.length
      }
    });

  } catch (error) {
    console.error('Error processing fall alert:', error);
    res.status(500).json({ 
      error: 'Failed to process fall alert',
      message: error.message 
    });
  }
};

/**
 * GET /api/notify/fall-alerts
 * Get all fall alerts (with optional filters)
 */
export const getFallAlerts = async (req, res) => {
  try {
    const { acknowledged, userId, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        fa.*,
        u.name as user_name,
        u.email as user_email,
        ack.name as acknowledged_by_name
      FROM fall_alerts fa
      LEFT JOIN users u ON fa.user_id = u.id
      LEFT JOIN users ack ON fa.acknowledged_by = ack.id
      WHERE 1=1
    `;
    const params = [];

    if (acknowledged !== undefined) {
      query += ' AND fa.acknowledged = ?';
      params.push(acknowledged === 'true' ? 1 : 0);
    }

    if (userId) {
      query += ' AND fa.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY fa.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    const [alerts] = await db.query(query, params);

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });

  } catch (error) {
    console.error('Error fetching fall alerts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch fall alerts',
      message: error.message 
    });
  }
};

/**
 * PUT /api/notify/fall-alerts/:id/acknowledge
 * Acknowledge a fall alert
 */
export const acknowledgeFallAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const caregiverId = req.userId; // From JWT middleware

    // Update the alert
    const [result] = await db.query(
      `UPDATE fall_alerts 
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = NOW() 
       WHERE id = ?`,
      [caregiverId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fall alert not found' });
    }

    // Get alert details
    const [alert] = await db.query(
      `SELECT fa.*, u.name as user_name, c.name as caregiver_name
       FROM fall_alerts fa
       LEFT JOIN users u ON fa.user_id = u.id
       LEFT JOIN users c ON fa.acknowledged_by = c.id
       WHERE fa.id = ?`,
      [id]
    );

    res.json({
      message: 'Fall alert acknowledged successfully',
      alert: alert[0]
    });

  } catch (error) {
    console.error('Error acknowledging fall alert:', error);
    res.status(500).json({ 
      error: 'Failed to acknowledge fall alert',
      message: error.message 
    });
  }
};

/**
 * Helper function to check and escalate unacknowledged alerts via SMS
 */
async function checkAndEscalateFallAlert(fallAlertId, userId, elderlyName, timestamp, caregivers, emergencyContacts) {
  try {
    // Check if alert has been acknowledged
    const [alert] = await db.query(
      'SELECT acknowledged FROM fall_alerts WHERE id = ?',
      [fallAlertId]
    );

    if (alert.length === 0 || alert[0].acknowledged === 1) {
      console.log(`Fall alert ${fallAlertId} already acknowledged, skipping escalation`);
      return;
    }

    // Alert not acknowledged - send SMS escalation
    const smsMessage = `🚨 URGENT: ${elderlyName} fell at ${new Date(timestamp).toLocaleString()}. Alert not acknowledged. Please respond immediately!`;

    // Send SMS to all caregivers
    for (const caregiver of caregivers) {
      if (caregiver.phone) {
        await sendSMSAlert(caregiver.phone, smsMessage)
          .catch(err => console.error(`SMS to caregiver ${caregiver.phone} failed:`, err));
      }
    }

    // Send SMS to emergency contacts
    for (const contact of emergencyContacts) {
      if (contact.phone) {
        await sendSMSAlert(contact.phone, smsMessage)
          .catch(err => console.error(`SMS to emergency contact ${contact.phone} failed:`, err));
      }
    }

    console.log(`Escalation SMS sent for fall alert ${fallAlertId}`);

  } catch (error) {
    console.error('Error in fall alert escalation:', error);
  }
}

export default {
  receiveFallAlert,
  getFallAlerts,
  acknowledgeFallAlert
};