// backend/src/utils/notificationService.js
import webpush from 'web-push';
import nodemailer from 'nodemailer';
import db from '../db.js';

// Configure Web Push
webpush.setVapidDetails(
  process.env.WEB_PUSH_EMAIL,
  process.env.WEB_PUSH_PUBLIC_KEY,
  process.env.WEB_PUSH_PRIVATE_KEY
);

// Configure Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send push notification to a specific user
 * @param {number} userId - User ID to send notification to
 * @param {object} payload - Notification payload
 */
export async function sendPushToUser(userId, payload) {
  try {
    // Get all push subscriptions for this user
    const [subscriptions] = await db.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const results = {
      sent: 0,
      failed: 0
    };

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(
          subscription,
          JSON.stringify(payload)
        );

        results.sent++;
        await logNotification('push', sub.endpoint, payload.title || 'Push notification', 'sent');
      } catch (error) {
        console.error(`Failed to send push to subscription:`, error.message);
        results.failed++;
        await logNotification('push', sub.endpoint, payload.title || 'Push notification', 'failed', error.message);

        // If subscription is invalid, remove it
        if (error.statusCode === 410) {
          await db.query(
            'DELETE FROM push_subscriptions WHERE endpoint = ?',
            [sub.endpoint]
          );
          console.log('Removed invalid subscription');
        }
      }
    }

    return results;

  } catch (error) {
    console.error('Error in sendPushToUser:', error);
    throw error;
  }
}

/**
 * Send email alert
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 */
export async function sendEmailAlert(to, subject, text, html = null) {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    
    // Log to database
    await logNotification('email', to, subject, 'sent');
    
    return info;

  } catch (error) {
    console.error('❌ Error sending email:', error);
    await logNotification('email', to, subject, 'failed', error.message);
    throw error;
  }
}

/**
 * Send SMS alert (using Fast2SMS for India)
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message
 */
export async function sendSMSAlert(phone, message) {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
      console.warn('Fast2SMS API key not configured, skipping SMS');
      await logNotification('sms', phone, message, 'skipped', 'API key not configured');
      return { skipped: true };
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/\D/g, '');

    // Fast2SMS API call
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: cleanPhone
      })
    });

    const data = await response.json();

    if (data.return === true) {
      console.log(`SMS sent to ${phone}`);
      await logNotification('sms', phone, message, 'sent');
      return data;
    } else {
      console.error('SMS failed:', data.message);
      await logNotification('sms', phone, message, 'failed', data.message);
      throw new Error(data.message || 'SMS failed');
    }

  } catch (error) {
    console.error('Error sending SMS:', error);
    await logNotification('sms', phone, message, 'failed', error.message);
    throw error;
  }
}

/**
 * Log notification to database for tracking
 * @param {string} type - Notification type (email, sms, push)
 * @param {string} recipient - Recipient identifier
 * @param {string} content - Notification content/subject
 * @param {string} status - Status (sent, failed, skipped)
 * @param {string} error - Error message if failed
 */
async function logNotification(type, recipient, content, status, error = null) {
  try {
    console.log(`📝 Logging notification: ${type} to ${recipient} - ${status}`);
    
    // Truncate content to avoid overflow
    const truncatedContent = content ? content.substring(0, 500) : null;
    
    const [result] = await db.query(
      'INSERT INTO notification_logs (type, recipient, content, status, error_message) VALUES (?, ?, ?, ?, ?)',
      [type, recipient, truncatedContent, status, error]
    );
    
    console.log(`✅ Notification logged with ID: ${result.insertId}`);
    
  } catch (err) {
    // Don't throw - we don't want logging failures to break notifications
    console.error('❌ Failed to log notification:', err.message);
    console.error('   Type:', type, 'Recipient:', recipient, 'Status:', status);
    console.error('   Full error:', err);
  }
}

export default {
  sendPushToUser,
  sendEmailAlert,
  sendSMSAlert
};