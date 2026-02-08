const express = require('express');
const { db } = require('../database/db');

const router = express.Router();

// Get all active stylists
router.get('/', (req, res) => {
  try {
    const stylists = db.prepare(`
      SELECT s.id, u.name, s.bio
      FROM stylists s
      JOIN users u ON s.user_id = u.id
      WHERE s.active = 1
    `).all();
    
    res.json(stylists);
  } catch (error) {
    console.error('Error fetching stylists:', error);
    res.status(500).json({ error: 'Failed to fetch stylists' });
  }
});

module.exports = router;
