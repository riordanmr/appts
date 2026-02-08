require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const db = require('./database/db');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const stylistRoutes = require('./routes/stylists');
const serviceRoutes = require('./routes/services');
const { sendReminders } = require('./services/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/stylists', stylistRoutes);
app.use('/api/services', serviceRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/stylist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stylist.html'));
});

// Schedule reminder notifications
// Run every hour to check for upcoming appointments
cron.schedule('0 * * * *', () => {
  console.log('Running reminder check...');
  sendReminders();
});

// Initialize database and start server
db.initialize();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
