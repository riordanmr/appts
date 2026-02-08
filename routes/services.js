const express = require('express');
const { db } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendAppointmentConfirmation } = require('../services/notifications');

const router = express.Router();

// Get all services
router.get('/', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services WHERE active = 1').all();
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

module.exports = router;
