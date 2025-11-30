import cron from 'node-cron';
import db from '../db.js';

let cronJob = null;

// Check reminders every minute
export const startReminderScheduler = () => {
  if (cronJob) {
    console.log('Scheduler already running');
    return;
  }

  // Run every minute
  cronJob = cron.schedule('* * * * *', async () => {
    try {
      await checkAndTriggerReminders();
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });

  console.log('Reminder scheduler started - checking every minute');
};

// Stop the scheduler
export const stopReminderScheduler = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('Reminder scheduler stopped');
  }
};

// Check for reminders that should trigger now
const checkAndTriggerReminders = async () => {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    // Get all enabled reminders that match current time
    const [reminders] = await db.query(
      `SELECT r.*, u.name as user_name, u.email as user_email 
       FROM reminders r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.enabled = 1 AND r.time = ?`,
      [currentTime]
    );

    if (reminders.length > 0) {
      console.log(`Found ${reminders.length} reminder(s) to trigger at ${currentTime}`);
    }

    for (const reminder of reminders) {
      let shouldTrigger = false;

      switch (reminder.repeat_type) {
        case 'daily':
          shouldTrigger = true;
          break;
        
        case 'weekly':
          const createdDay = new Date(reminder.created_at).getDay();
          const currentWeekDay = now.getDay();
          shouldTrigger = createdDay === currentWeekDay;
          break;
        
        case 'monthly':
          const createdDate = new Date(reminder.created_at).getDate();
          shouldTrigger = createdDate === now.getDate();
          break;
        
        case 'none':
          const lastTriggered = await getLastTriggeredDate(reminder.id);
          const today = now.toDateString();
          shouldTrigger = lastTriggered !== today;
          break;
        
        default:
          shouldTrigger = false;
      }

      if (shouldTrigger) {
        await triggerReminder(reminder);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

// Trigger a reminder
const triggerReminder = async (reminder) => {
  try {
    console.log(`TRIGGERING: "${reminder.title}" for user ${reminder.user_name}`);
    
    // Store the trigger event
    await storeReminderEvent(reminder);
    
    // Try to send push notification (don't fail if it doesn't work)
    try {
      const { sendPushNotification } = await import('../controllers/notify.js');
      await sendPushNotification(reminder.user_id, {
        title: 'Reminder: ' + reminder.title,
        body: reminder.notes || 'Time for your reminder!',
        icon: '/vite.svg',
        tag: 'reminder-' + reminder.id,
        data: {
          reminderId: reminder.id,
          url: '/reminders'
        }
      });
    } catch (pushError) {
      console.log('Push notification skipped:', pushError.message);
    }
    
  } catch (error) {
    console.error('Error triggering reminder:', error);
  }
};

// Store reminder event
const storeReminderEvent = async (reminder) => {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS reminder_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reminder_id INT NOT NULL,
        user_id INT NOT NULL,
        triggered_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reminder_id (reminder_id),
        INDEX idx_triggered_at (triggered_at)
      )`
    );

    await db.query(
      `INSERT INTO reminder_events (reminder_id, user_id, triggered_at) 
       VALUES (?, ?, NOW())`,
      [reminder.id, reminder.user_id]
    );
  } catch (error) {
    console.error('Error storing reminder event:', error);
  }
};

// Get last triggered date
const getLastTriggeredDate = async (reminderId) => {
  try {
    const [events] = await db.query(
      `SELECT DATE(triggered_at) as trigger_date 
       FROM reminder_events 
       WHERE reminder_id = ? 
       ORDER BY triggered_at DESC 
       LIMIT 1`,
      [reminderId]
    );

    if (events.length > 0) {
      return new Date(events[0].trigger_date).toDateString();
    }
    return null;
  } catch (error) {
    return null;
  }
};