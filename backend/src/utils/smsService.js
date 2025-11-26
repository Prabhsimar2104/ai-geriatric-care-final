// backend/src/utils/smsService.js
// Updated to work WITHOUT Fast2SMS (logs instead of sending)

import dotenv from 'dotenv';
import db from '../db.js';

dotenv.config();

// Check if SMS is configured
const isSMSConfigured = () => {
  return !!process.env.FAST2SMS_API_KEY;
};

// Log notification to database
const logNotification = async (userId, recipient, category, status, message, error = null) => {
  try {
    await db.query(
      `INSERT INTO notification_logs (user_id, type, category, recipient, status, error_message, sent_at)
       VALUES (?, 'sms', ?, ?, ?, ?, NOW())`,
      [userId, category, recipient, status, error]
    );
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
};

// Send SMS (with fallback if not configured)
export const sendSMS = async (phoneNumber, message, userId = null, category = 'test') => {
  try {
    // Clean phone number
    const cleanPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');

    // Validate Indian phone number (10 digits)
    if (cleanPhone.length !== 10) {
      const error = 'Invalid Indian phone number format (needs 10 digits)';
      console.error('❌', error);
      
      if (userId) {
        await logNotification(userId, phoneNumber, category, 'failed', message, error);
      }
      
      return { success: false, error };
    }

    // If SMS not configured, just log it
    if (!isSMSConfigured()) {
      console.log('📱 SMS (Simulated - No API Key):', {
        to: cleanPhone,
        message: message.substring(0, 50) + '...'
      });

      if (userId) {
        await logNotification(userId, cleanPhone, category, 'sent', message, 'Simulated - No SMS API configured');
      }

      return { 
        success: true, 
        messageId: `sim_${Date.now()}`,
        simulated: true,
        note: 'SMS not sent - no API key configured. Check notification_logs table.'
      };
    }

    // If configured, send via Fast2SMS (or your chosen provider)
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    const params = new URLSearchParams({
      authorization: process.env.FAST2SMS_API_KEY,
      message: message.substring(0, 160), // SMS limit 160 chars
      route: 'q', // Quick route
      numbers: cleanPhone
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();

    if (data.return === true) {
      console.log('✅ SMS sent successfully to:', cleanPhone);
      
      if (userId) {
        await logNotification(userId, cleanPhone, category, 'sent', message);
      }
      
      return { success: true, messageId: data.request_id };
    } else {
      console.error('❌ SMS send failed:', data.message);
      
      if (userId) {
        await logNotification(userId, cleanPhone, category, 'failed', message, data.message);
      }
      
      return { success: false, error: data.message };
    }

  } catch (error) {
    console.error('❌ SMS send error:', error);
    
    if (userId) {
      await logNotification(userId, phoneNumber, category, 'failed', message, error.message);
    }
    
    return { success: false, error: error.message };
  }
};

// Send fall alert SMS
export const sendFallAlertSMS = async (phoneNumber, userName, userId = null) => {
  const message = `🚨 URGENT: Fall detected for ${userName}! Please check immediately. View details: ${process.env.APP_URL}/dashboard`;
  return await sendSMS(phoneNumber, message, userId, 'fall_alert');
};

// Send reminder SMS
export const sendReminderSMS = async (phoneNumber, userName, reminderTitle, userId = null) => {
  const message = `⏰ Reminder for ${userName}: ${reminderTitle}. Take care!`;
  return await sendSMS(phoneNumber, message, userId, 'reminder');
};

// Send test SMS
export const sendTestSMS = async (phoneNumber, userId = null) => {
  const message = `✅ Test SMS from AI Geriatric Care. Your SMS notifications are configured!`;
  return await sendSMS(phoneNumber, message, userId, 'test');
};

// Check SMS service status
export const getSMSServiceStatus = () => {
  return {
    configured: isSMSConfigured(),
    provider: isSMSConfigured() ? 'Fast2SMS' : 'None',
    mode: isSMSConfigured() ? 'Active' : 'Simulated (Logging Only)'
  };
};