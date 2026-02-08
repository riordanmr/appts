const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email transporter setup
let emailTransporter;
if (process.env.EMAIL_API_KEY) {
  emailTransporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.EMAIL_API_KEY
    }
  });
} else {
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
  const stylistName = appointment.stylistName || 'Any available stylist';
  
  const emailSubject = `Appointment Confirmation - ${businessName}`;
  const emailText = `
Hello ${appointment.customerName},

Your appointment has been confirmed!

Service: ${appointment.serviceName}
Stylist: ${stylistName}
Date: ${appointment.appointmentDate}
Time: ${appointment.appointmentTime}

You will receive a reminder 1 day before your appointment.

Thank you for choosing ${businessName}!
  `;

  const emailHtml = `
    <h2>Appointment Confirmation</h2>
    <p>Hello ${appointment.customerName},</p>
    <p>Your appointment has been confirmed!</p>
    <ul>
      <li><strong>Service:</strong> ${appointment.serviceName}</li>
      <li><strong>Stylist:</strong> ${stylistName}</li>
      <li><strong>Date:</strong> ${appointment.appointmentDate}</li>
      <li><strong>Time:</strong> ${appointment.appointmentTime}</li>
    </ul>
    <p>You will receive a reminder 1 day before your appointment.</p>
    <p>Thank you for choosing ${businessName}!</p>
  `;

  const smsMessage = `${businessName}: Your appointment is confirmed for ${appointment.appointmentDate} at ${appointment.appointmentTime}. Service: ${appointment.serviceName}`;

  try {
    await Promise.all([
      sendEmail(appointment.customerEmail, emailSubject, emailText, emailHtml),
      sendSMS(appointment.customerPhone, smsMessage)
    ]);
  } catch (error) {
    console.error('Error sending confirmation:', error);
  }
}

async function sendAppointmentReminder(appointment) {
  const businessName = process.env.BUSINESS_NAME || 'Hair Salon';
  const stylistName = appointment.stylistName || 'Any available stylist';
  
  const emailSubject = `Reminder: Appointment Tomorrow - ${businessName}`;
  const emailText = `
Hello ${appointment.customerName},

This is a reminder about your appointment tomorrow:

Service: ${appointment.serviceName}
Stylist: ${stylistName}
Date: ${appointment.appointmentDate}
Time: ${appointment.appointmentTime}

We look forward to seeing you!

${businessName}
  `;

  const emailHtml = `
    <h2>Appointment Reminder</h2>
    <p>Hello ${appointment.customerName},</p>
    <p>This is a reminder about your appointment tomorrow:</p>
    <ul>
      <li><strong>Service:</strong> ${appointment.serviceName}</li>
      <li><strong>Stylist:</strong> ${stylistName}</li>
      <li><strong>Date:</strong> ${appointment.appointmentDate}</li>
      <li><strong>Time:</strong> ${appointment.appointmentTime}</li>
    </ul>
    <p>We look forward to seeing you!</p>
    <p>${businessName}</p>
  `;

  const smsMessage = `${businessName}: Reminder - Your appointment is tomorrow at ${appointment.appointmentTime}. Service: ${appointment.serviceName}`;

  try {
    await Promise.all([
      sendEmail(appointment.customerEmail, emailSubject, emailText, emailHtml),
      sendSMS(appointment.customerPhone, smsMessage)
    ]);
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendAppointmentConfirmation,
  sendAppointmentReminder
};
