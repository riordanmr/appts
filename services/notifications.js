const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { db } = require('../database/db');

// Email transporter setup
let emailTransporter;
if (process.env.EMAIL_API_KEY) {
  // Using SendGrid for Azure compatibility
  emailTransporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.EMAIL_API_KEY
    }
  });
} else {
  // Fallback to console logging if not configured
  console.warn('Email not configured - notifications will be logged to console');
}

// SMS client setup
let smsClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
  console.warn('SMS not configured - notifications will be logged to console');
}

async function sendEmail(to, subject, text, html) {
  if (!emailTransporter) {
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@salon.com',
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}

async function sendSMS(to, message) {
  if (!smsClient) {
    console.log(`[SMS] To: ${to}, Message: ${message}`);
    return;
  }

  try {
    await smsClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    console.log(`SMS sent to ${to}`);
  } catch (error) {
    console.error('SMS error:', error);
    throw error;
  }
}

async function sendAppointmentConfirmation(appointment) {
  const businessName = process.env.BUSINESS_NAME || 'Hair Salon';
  const stylistName = appointment.stylist_name || 'Any available stylist';
  
  const emailSubject = `Appointment Confirmation - ${businessName}`;
  const emailText = `
Hello ${appointment.customer_name},

Your appointment has been confirmed!

Service: ${appointment.service_name}
Stylist: ${stylistName}
Date: ${appointment.appointment_date}
Time: ${appointment.appointment_time}

You will receive a reminder 1 day before your appointment.

Thank you for choosing ${businessName}!
  `;

  const emailHtml = `
    <h2>Appointment Confirmation</h2>
    <p>Hello ${appointment.customer_name},</p>
    <p>Your appointment has been confirmed!</p>
    <ul>
      <li><strong>Service:</strong> ${appointment.service_name}</li>
      <li><strong>Stylist:</strong> ${stylistName}</li>
      <li><strong>Date:</strong> ${appointment.appointment_date}</li>
      <li><strong>Time:</strong> ${appointment.appointment_time}</li>
    </ul>
    <p>You will receive a reminder 1 day before your appointment.</p>
    <p>Thank you for choosing ${businessName}!</p>
  `;

  const smsMessage = `${businessName}: Your appointment is confirmed for ${appointment.appointment_date} at ${appointment.appointment_time}. Service: ${appointment.service_name}`;

  try {
    await Promise.all([
      sendEmail(appointment.customer_email, emailSubject, emailText, emailHtml),
      sendSMS(appointment.customer_phone, smsMessage)
    ]);
    
    // Mark reminder as sent
    db.prepare('UPDATE appointments SET reminder_sent = 1 WHERE id = ?').run(appointment.id);
  } catch (error) {
    console.error('Error sending confirmation:', error);
  }
}

async function sendReminders() {
  try {
    // Get appointments for tomorrow that haven't had day-before reminder sent
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointments = db.prepare(`
      SELECT 
        a.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        s.name as service_name,
        st.name as stylist_name
      FROM appointments a
      JOIN users u ON a.customer_id = u.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN stylists sty ON a.stylist_id = sty.id
      LEFT JOIN users st ON sty.user_id = st.id
      WHERE a.appointment_date = ?
        AND a.status = 'scheduled'
        AND a.day_before_reminder_sent = 0
    `).all(tomorrowStr);

    const businessName = process.env.BUSINESS_NAME || 'Hair Salon';

    for (const appointment of appointments) {
      const stylistName = appointment.stylist_name || 'Any available stylist';
      
      const emailSubject = `Reminder: Appointment Tomorrow - ${businessName}`;
      const emailText = `
Hello ${appointment.customer_name},

This is a reminder about your appointment tomorrow:

Service: ${appointment.service_name}
Stylist: ${stylistName}
Date: ${appointment.appointment_date}
Time: ${appointment.appointment_time}

We look forward to seeing you!

${businessName}
      `;

      const emailHtml = `
        <h2>Appointment Reminder</h2>
        <p>Hello ${appointment.customer_name},</p>
        <p>This is a reminder about your appointment tomorrow:</p>
        <ul>
          <li><strong>Service:</strong> ${appointment.service_name}</li>
          <li><strong>Stylist:</strong> ${stylistName}</li>
          <li><strong>Date:</strong> ${appointment.appointment_date}</li>
          <li><strong>Time:</strong> ${appointment.appointment_time}</li>
        </ul>
        <p>We look forward to seeing you!</p>
        <p>${businessName}</p>
      `;

      const smsMessage = `${businessName}: Reminder - Your appointment is tomorrow at ${appointment.appointment_time}. Service: ${appointment.service_name}`;

      try {
        await Promise.all([
          sendEmail(appointment.customer_email, emailSubject, emailText, emailHtml),
          sendSMS(appointment.customer_phone, smsMessage)
        ]);
        
        // Mark day-before reminder as sent
        db.prepare('UPDATE appointments SET day_before_reminder_sent = 1 WHERE id = ?').run(appointment.id);
        console.log(`Reminder sent for appointment ${appointment.id}`);
      } catch (error) {
        console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
      }
    }

    if (appointments.length > 0) {
      console.log(`Sent ${appointments.length} reminder(s)`);
    }
  } catch (error) {
    console.error('Error in sendReminders:', error);
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendAppointmentConfirmation,
  sendReminders
};
