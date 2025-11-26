// backend/src/controllers/notify.js
// Fixed version with proper logging

import db from '../db.js';
import webpush from 'web-push';
import dotenv from 'dotenv';
import { sendFallAlertEmail, sendReminderEmail, sendTestEmail } from '../utils/emailService.js';
import { sendFallAlertSMS, sendReminderSMS, sendTestSMS } from '../utils/smsService.js';

dotenv.config();

// Configure web-push
webpush.setVapidDetails(
  process.env.WEB_PUSH_EMAIL,
  process.env.WEB_PUSH_PUBLIC_KEY,
  process.env.WEB_PUSH_PRIVATE_KEY
);

// Get active reminders for current user (for real-time checking)
export const getActiveReminders = async (req, res) => {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    // Get reminders that should trigger now
    const [reminders] = await db.query(
      `SELECT * FROM reminders 
       WHERE user_id = ? AND enabled = 1 AND time = ?`,
      [req.user.id, currentTime]
    );

    res.json({
      success: true,
      reminders: reminders,
      currentTime: currentTime
    });

  } catch (error) {
    console.error('Get active reminders error:', error);
    res.status(500).json({
      error: 'Failed to get active reminders',
      message: error.message
    });
  }
};

// Get recent reminder events (history)
export const getReminderEvents = async (req, res) => {
  try {
    const [events] = await db.query(
      `SELECT re.*, r.title, r.notes 
       FROM reminder_events re
       JOIN reminders r ON re.reminder_id = r.id
       WHERE re.user_id = ?
       ORDER BY re.triggered_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      success: true,
      events: events
    });

  } catch (error) {
    console.error('Get reminder events error:', error);
    res.status(500).json({
      error: 'Failed to get reminder events',
      message: error.message
    });
  }
};

// Test notification (manual trigger)
export const testNotification = async (req, res) => {
  try {
    const { reminderId } = req.body;

    if (!reminderId) {
      return res.status(400).json({
        error: 'Reminder ID is required'
      });
    }

    // Get reminder details
    const [reminders] = await db.query(
      `SELECT * FROM reminders WHERE id = ? AND user_id = ?`,
      [reminderId, req.user.id]
    );

    if (reminders.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found'
      });
    }

    const reminder = reminders[0];

    res.json({
      success: true,
      message: 'Test notification triggered',
      reminder: {
        id: reminder.id,
        title: reminder.title,
        notes: reminder.notes,
        time: reminder.time
      }
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      message: error.message
    });
  }
};

// Save push subscription
export const savePushSubscription = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        error: 'Invalid subscription data'
      });
    }

    // Check if subscription already exists
    const [existing] = await db.query(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [req.user.id, endpoint]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Subscription already exists'
      });
    }

    // Save new subscription
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );

    res.json({
      success: true,
      message: 'Push subscription saved'
    });

  } catch (error) {
    console.error('Save subscription error:', error);
    res.status(500).json({
      error: 'Failed to save subscription',
      message: error.message
    });
  }
};

// Send push notification to user
export const sendPushNotification = async (userId, payload) => {
  try {
    // Get all subscriptions for this user
    const [subscriptions] = await db.query(
      'SELECT * FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return;
    }

    // Send to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        console.log('✅ Push notification sent to:', sub.endpoint.substring(0, 50) + '...');
      } catch (error) {
        console.error('Failed to send push:', error);
        
        // If subscription is invalid, remove it
        if (error.statusCode === 410) {
          await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          console.log('Removed invalid subscription');
        }
      }
    });

    await Promise.all(sendPromises);

  } catch (error) {
    console.error('Send push notification error:', error);
  }
};

// Get VAPID public key
export const getVapidPublicKey = async (req, res) => {
  res.json({
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY
  });
};

// Send test email (FIXED - now passes userId)
export const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email address is required'
      });
    }

    // Pass userId from authenticated user
    const result = await sendTestEmail(email, req.user.id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test email',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
};

// Send test SMS (FIXED - now passes userId)
export const testSMS = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        error: 'Phone number is required'
      });
    }

    // Pass userId from authenticated user
    const result = await sendTestSMS(phone, req.user.id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test SMS sent successfully',
        messageId: result.messageId,
        simulated: result.simulated || false,
        note: result.note || null
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test SMS',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({
      error: 'Failed to send test SMS',
      message: error.message
    });
  }
};

// Notify emergency contacts about fall alert
export const notifyEmergencyContacts = async (userId, alertData) => {
  try {
    // Get user info
    const [users] = await db.query(
      'SELECT name, email FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      console.error('User not found:', userId);
      return;
    }

    const userName = users[0].name;

    // Get emergency contacts
    const [contacts] = await db.query(
      'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority ASC',
      [userId]
    );

    if (contacts.length === 0) {
      console.log('No emergency contacts found for user:', userId);
      return;
    }

    const emailData = {
      userName,
      timestamp: alertData.timestamp || new Date().toISOString(),
      confidence: alertData.confidence || 0.9,
      imageUrl: alertData.imageUrl || null
    };

    // Send email to all contacts (with userId for logging)
    for (const contact of contacts) {
      if (contact.email) {
        await sendFallAlertEmail(contact.email, emailData, userId);
      }
      
      // Send SMS if phone exists (with userId for logging)
      if (contact.phone) {
        await sendFallAlertSMS(contact.phone, userName, userId);
      }
    }

    console.log(`✅ Notified ${contacts.length} emergency contact(s)`);

  } catch (error) {
    console.error('Error notifying emergency contacts:', error);
  }
};

// Notify about critical reminder
export const notifyCriticalReminder = async (reminder, user) => {
  try {
    // Get emergency contacts
    const [contacts] = await db.query(
      'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority ASC LIMIT 1',
      [user.id]
    );

    const reminderData = {
      userName: user.name,
      reminderTitle: reminder.title,
      reminderNotes: reminder.notes,
      reminderTime: reminder.time
    };

    // Send email to primary contact (with userId for logging)
    if (contacts.length > 0 && contacts[0].email) {
      await sendReminderEmail(contacts[0].email, reminderData, user.id);
    }

    // Also send to user if they have email (with userId for logging)
    if (user.email) {
      await sendReminderEmail(user.email, reminderData, user.id);
    }

    console.log('✅ Critical reminder notification sent');

  } catch (error) {
    console.error('Error sending reminder notification:', error);
  }
};

// Get notification logs for current user
export const getNotificationLogs = async (req, res) => {
  try {
    const { limit = 50, type, category } = req.query;

    let query = 'SELECT * FROM notification_logs WHERE user_id = ?';
    const params = [req.user.id];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [logs] = await db.query(query, params);

    res.json({
      success: true,
      logs: logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Get notification logs error:', error);
    res.status(500).json({
      error: 'Failed to get notification logs',
      message: error.message
    });
  }
};