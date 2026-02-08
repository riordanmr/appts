const { app } = require('@azure/functions');
const { ensureTablesExist, getAppointmentsForReminder, updateAppointment } = require('../shared/tableStorage');
const { sendAppointmentReminder } = require('../shared/utils/notifications');

app.timer('sendReminders', {
  schedule: '0 0 * * * *', // Every hour
  handler: async (myTimer, context) => {
    try {
      await ensureTablesExist();

      context.log('Running reminder check...');

      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get appointments that need reminders
      const appointments = await getAppointmentsForReminder(tomorrowStr);

      context.log(`Found ${appointments.length} appointments needing reminders`);

      for (const appointment of appointments) {
        try {
          // Send reminder
          await sendAppointmentReminder(appointment);
          
          // Mark as sent
          await updateAppointment(appointment.rowKey, {
            dayBeforeReminderSent: true
          });
          
          context.log(`Reminder sent for appointment ${appointment.rowKey}`);
        } catch (error) {
          context.error(`Error sending reminder for appointment ${appointment.rowKey}:`, error);
        }
      }

      context.log(`Sent ${appointments.length} reminder(s)`);
    } catch (error) {
      context.error('Error in sendReminders:', error);
    }
  }
});
