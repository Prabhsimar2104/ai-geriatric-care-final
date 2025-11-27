// backend/src/controllers/fallAlerts.js
import db from '../db.js';
import { sendFallAlertEmail } from '../utils/emailService.js';
import { sendFallAlertSMS } from '../utils/smsService.js';
import { sendPushNotification } from './notify.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * POST /api/notify/fall-alert
 * Receives fall detection alert from Python CV system
 * Protected by X-API-KEY header
 */
export const receiveFallAlert = async (req, res) => {
  try {
    // Handle both camelCase (userId) and snake_case (user_id) from Python
    const userId = req.body.userId || req.body.user_id;
    const timestamp = req.body.timestamp;
    const confidence = req.body.confidence;
    const imageUrl = req.body.imageUrl || req.body.image_url;
    const fallType = req.body.fallType || req.body.fall_type;

    console.log('🚨 Fall alert received:', {
      userId,
      timestamp,
      confidence,
      fallType,
      imageUrl: imageUrl ? 'Yes' : 'No'
    });

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
    console.log(`✅ Fall alert saved to database (ID: ${fallAlertId})`);

    // Get user details
    const [users] = await db.query(
      'SELECT id, name, email, phone, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get emergency contacts for this user
    const [emergencyContacts] = await db.query(
      'SELECT name, email, phone, relationship, priority FROM emergency_contacts WHERE user_id = ? ORDER BY priority ASC',
      [userId]
    );

    console.log(`📋 Found ${emergencyContacts.length} emergency contact(s)`);

    if (emergencyContacts.length === 0) {
      console.log('⚠️  No emergency contacts found, saving alert only');
      return res.status(201).json({ 
        message: 'Fall alert saved but no emergency contacts to notify',
        fallAlertId,
        notificationsSent: {
          contacts: 0,
          emails: 0,
          sms: 0
        }
      });
    }

    // Prepare alert data for emails
    const emailData = {
      userName: user.name,
      timestamp: timestamp,
      confidence: confidence || 0.9,
      imageUrl: imageUrl || null
    };

    // Send notifications to all emergency contacts
    let emailsSent = 0;
    let smsSent = 0;
    const notificationPromises = [];

    for (const contact of emergencyContacts) {
      // Send email if available
      if (contact.email) {
        notificationPromises.push(
          sendFallAlertEmail(contact.email, emailData, userId)
            .then(result => {
              if (result.success) {
                emailsSent++;
                console.log(`✅ Fall alert email sent to: ${contact.email}`);
              } else {
                console.error(`❌ Failed to send email to: ${contact.email}`, result.error);
              }
            })
            .catch(err => console.error(`❌ Email error for ${contact.email}:`, err))
        );
      }

      // Send SMS if available
      if (contact.phone) {
        notificationPromises.push(
          sendFallAlertSMS(contact.phone, user.name, userId)
            .then(result => {
              if (result.success) {
                smsSent++;
                console.log(`✅ Fall alert SMS sent to: ${contact.phone}`);
              } else {
                console.error(`❌ Failed to send SMS to: ${contact.phone}`, result.error);
              }
            })
            .catch(err => console.error(`❌ SMS error for ${contact.phone}:`, err))
        );
      }
    }

    // Send push notification to user
    notificationPromises.push(
      sendPushNotification(userId, {
        title: '🚨 Fall Alert',
        body: `Fall detected! Emergency contacts have been notified.`,
        icon: '/fall-alert-icon.png',
        tag: `fall-alert-${fallAlertId}`,
        requireInteraction: true,
        data: {
          type: 'fall-alert',
          fallAlertId,
          timestamp
        }
      }).catch(err => console.error('Push notification error:', err))
    );

    // Wait for all notifications to complete
    await Promise.all(notificationPromises);

    console.log(`✅ Fall alert processed: ${emailsSent} emails, ${smsSent} SMS sent`);

    // Schedule SMS escalation if not acknowledged
    const smsDelayMinutes = parseInt(process.env.FALL_ALERT_SMS_DELAY_MINUTES) || 10;
    setTimeout(async () => {
      await checkAndEscalateFallAlert(fallAlertId, userId, user.name, timestamp, emergencyContacts);
    }, smsDelayMinutes * 60 * 1000);

    res.status(201).json({ 
      message: 'Fall alert received and notifications sent',
      fallAlertId,
      notificationsSent: {
        contacts: emergencyContacts.length,
        emails: emailsSent,
        sms: smsSent
      }
    });

  } catch (error) {
    console.error('❌ Error processing fall alert:', error);
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

    // If not admin, only show user's own alerts
    if (req.user.role !== 'caregiver') {
      query += ' AND fa.user_id = ?';
      params.push(req.user.id);
    }

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
    const userId = req.user.id;

    // Update the alert
    const [result] = await db.query(
      `UPDATE fall_alerts 
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = NOW() 
       WHERE id = ?`,
      [userId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fall alert not found' });
    }

    // Get alert details
    const [alert] = await db.query(
      `SELECT fa.*, u.name as user_name, ack.name as acknowledged_by_name
       FROM fall_alerts fa
       LEFT JOIN users u ON fa.user_id = u.id
       LEFT JOIN users ack ON fa.acknowledged_by = ack.id
       WHERE fa.id = ?`,
      [id]
    );

    console.log(`✅ Fall alert ${id} acknowledged by user ${userId}`);

    res.json({
      success: true,
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
async function checkAndEscalateFallAlert(fallAlertId, userId, userName, timestamp, emergencyContacts) {
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

    console.log(`⚠️  Fall alert ${fallAlertId} not acknowledged, escalating...`);

    // Alert not acknowledged - send SMS escalation
    const smsMessage = `🚨 URGENT: ${userName} fell at ${new Date(timestamp).toLocaleString()}. Alert not acknowledged. Please respond immediately!`;

    // Send SMS to all emergency contacts
    for (const contact of emergencyContacts) {
      if (contact.phone) {
        await sendFallAlertSMS(contact.phone, userName, userId)
          .catch(err => console.error(`SMS escalation error for ${contact.phone}:`, err));
      }
    }

    console.log(`✅ Escalation SMS sent for fall alert ${fallAlertId}`);

  } catch (error) {
    console.error('Error in fall alert escalation:', error);
  }
}

export default {
  receiveFallAlert,
  getFallAlerts,
  acknowledgeFallAlert
};