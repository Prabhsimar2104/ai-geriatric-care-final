// backend/src/utils/emailService.js
// Updated with notification logging

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import db from '../db.js';

dotenv.config();

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email service is ready');
  }
});

// Log notification to database
const logNotification = async (userId, recipient, category, subject, status, messageId = null, error = null) => {
  try {
    await db.query(
      `INSERT INTO notification_logs (user_id, type, category, recipient, subject, status, message_id, error_message, sent_at)
       VALUES (?, 'email', ?, ?, ?, ?, ?, NOW())`,
      [userId, category, recipient, subject, status, messageId, error]
    );
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
};

// Send fall alert email
export const sendFallAlertEmail = async (to, data, userId = null) => {
  try {
    const { userName, timestamp, confidence, imageUrl } = data;

    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: '🚨 URGENT: Fall Detected!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🚨 FALL ALERT</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #dc3545;">Fall Detected!</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              A fall has been detected for <strong>${userName}</strong>.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
              <p><strong>Confidence:</strong> ${(confidence * 100).toFixed(1)}%</p>
              ${imageUrl ? `<p><strong>Image:</strong> <a href="${imageUrl}">View Image</a></p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/dashboard" 
                 style="background: #dc3545; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block;
                        font-weight: bold;">
                View Dashboard →
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Please check on ${userName} immediately and acknowledge this alert.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">${process.env.APP_NAME} - Automated Alert System</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Fall alert email sent:', info.messageId);
    
    if (userId) {
      await logNotification(userId, to, 'fall_alert', mailOptions.subject, 'sent', info.messageId);
    }
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email send error:', error);
    
    if (userId) {
      await logNotification(userId, to, 'fall_alert', '🚨 URGENT: Fall Detected!', 'failed', null, error.message);
    }
    
    return { success: false, error: error.message };
  }
};

// Send reminder email
export const sendReminderEmail = async (to, data, userId = null) => {
  try {
    const { userName, reminderTitle, reminderNotes, reminderTime } = data;

    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `⏰ Reminder: ${reminderTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">⏰ REMINDER</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #007bff;">Time for: ${reminderTitle}</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Hello <strong>${userName}</strong>, this is your reminder!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Reminder:</strong> ${reminderTitle}</p>
              <p><strong>Time:</strong> ${reminderTime}</p>
              ${reminderNotes ? `<p><strong>Notes:</strong> ${reminderNotes}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/reminders" 
                 style="background: #007bff; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block;
                        font-weight: bold;">
                View Reminders →
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">${process.env.APP_NAME} - Your Health Companion</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Reminder email sent:', info.messageId);
    
    if (userId) {
      await logNotification(userId, to, 'reminder', mailOptions.subject, 'sent', info.messageId);
    }
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email send error:', error);
    
    if (userId) {
      await logNotification(userId, to, 'reminder', `⏰ Reminder: ${data.reminderTitle}`, 'failed', null, error.message);
    }
    
    return { success: false, error: error.message };
  }
};

// Send test email
export const sendTestEmail = async (to, userId = null) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: '✅ Test Email from AI Geriatric Care',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Configuration Successful!</h2>
          <p>This is a test email from your AI Geriatric Care system.</p>
          <p>If you're seeing this, your email notifications are working correctly!</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent:', info.messageId);
    
    if (userId) {
      await logNotification(userId, to, 'test', mailOptions.subject, 'sent', info.messageId);
    }
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email send error:', error);
    
    if (userId) {
      await logNotification(userId, to, 'test', '✅ Test Email', 'failed', null, error.message);
    }
    
    return { success: false, error: error.message };
  }
};