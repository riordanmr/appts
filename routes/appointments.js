const express = require('express');
const { db } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendAppointmentConfirmation } = require('../services/notifications');

const router = express.Router();

// Get available time slots
router.get('/availability', (req, res) => {
  try {
    const { date, stylistId, serviceId } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({ error: 'Date and service ID are required' });
    }

    // Get service duration
    const service = db.prepare('SELECT duration_minutes FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Business hours configuration
    const startHour = parseInt(process.env.BUSINESS_HOURS_START || 9);
    const endHour = parseInt(process.env.BUSINESS_HOURS_END || 18);
    const slotDuration = service.duration_minutes;

    // Generate all possible time slots
    const allSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(slotTime);
      }
    }

    // Get existing appointments for the date
    let query = 'SELECT appointment_time, service_id FROM appointments WHERE appointment_date = ? AND status = ?';
    let params = [date, 'scheduled'];
    
    if (stylistId && stylistId !== 'any') {
      query += ' AND stylist_id = ?';
      params.push(stylistId);
    }

    const bookedAppointments = db.prepare(query).all(...params);

    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => {
      return !bookedAppointments.some(apt => {
        const aptTime = apt.appointment_time.substring(0, 5);
        return aptTime === slot;
      });
    });

    res.json({ availableSlots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Create new appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { serviceId, stylistId, date, time, notes } = req.body;
    const customerId = req.user.id;

    if (!serviceId || !date || !time) {
      return res.status(400).json({ error: 'Service, date, and time are required' });
    }

    // Validate notes length
    if (notes && notes.length > 1000) {
      return res.status(400).json({ error: 'Notes cannot exceed 1000 characters' });
    }

    // Insert appointment
    const result = db.prepare(`
      INSERT INTO appointments (customer_id, stylist_id, service_id, appointment_date, appointment_time, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(customerId, stylistId === 'any' ? null : stylistId, serviceId, date, time, notes || '');

    // Get appointment details for confirmation
    const appointment = db.prepare(`
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
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    // Send confirmation (asynchronously)
    sendAppointmentConfirmation(appointment).catch(err => {
      console.error('Failed to send confirmation:', err);
    });

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: {
        id: result.lastInsertRowid,
        ...appointment
      }
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get appointments for logged-in user
router.get('/my-appointments', authenticateToken, (req, res) => {
  try {
    const appointments = db.prepare(`
      SELECT 
        a.*,
        s.name as service_name,
        s.price,
        u.name as stylist_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      LEFT JOIN stylists sty ON a.stylist_id = sty.id
      LEFT JOIN users u ON sty.user_id = u.id
      WHERE a.customer_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `).all(req.user.id);

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get appointments for stylist (stylist view)
router.get('/stylist-appointments', authenticateToken, requireRole(['stylist', 'admin']), (req, res) => {
  try {
    // Get stylist ID from user
    const stylist = db.prepare('SELECT id FROM stylists WHERE user_id = ?').get(req.user.id);
    
    let query = `
      SELECT 
        a.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        s.name as service_name,
        s.duration_minutes,
        s.price
      FROM appointments a
      JOIN users u ON a.customer_id = u.id
      JOIN services s ON a.service_id = s.id
    `;

    let appointments;
    if (req.user.role === 'admin') {
      // Admin sees all appointments
      query += ' ORDER BY a.appointment_date, a.appointment_time';
      appointments = db.prepare(query).all();
    } else if (stylist) {
      // Stylist sees only their appointments
      query += ' WHERE a.stylist_id = ? ORDER BY a.appointment_date, a.appointment_time';
      appointments = db.prepare(query).all(stylist.id);
    } else {
      return res.status(404).json({ error: 'Stylist profile not found' });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching stylist appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Update appointment
router.put('/:id', authenticateToken, requireRole(['stylist', 'admin']), (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, status, notes } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (date) {
      updates.push('appointment_date = ?');
      values.push(date);
    }
    if (time) {
      updates.push('appointment_time = ?');
      values.push(time);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (notes !== undefined) {
      // Validate notes length
      if (notes.length > 1000) {
        return res.status(400).json({ error: 'Notes cannot exceed 1000 characters' });
      }
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = db.prepare(`
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment updated successfully' });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
router.delete('/:id', authenticateToken, requireRole(['stylist', 'admin']), (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
