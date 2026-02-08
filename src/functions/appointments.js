const { app } = require('@azure/functions');
const { authenticateToken, requireRole } = require('../shared/utils/auth');
const { sendAppointmentConfirmation } = require('../shared/utils/notifications');
const {
  ensureTablesExist,
  getAvailableSlots,
  createAppointment,
  getAppointmentsByCustomer,
  getAppointmentsByStylist,
  updateAppointment,
  deleteAppointment,
  getAllServices,
  getUserByEmail
} = require('../shared/tableStorage');

app.http('getAvailability', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'appointments/availability',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      const date = request.query.get('date');
      const serviceId = request.query.get('serviceId');
      const stylistId = request.query.get('stylistId');

      if (!date || !serviceId) {
        return {
          status: 400,
          jsonBody: { error: 'Date and service ID are required' }
        };
      }

      const availableSlots = await getAvailableSlots(date, serviceId, stylistId);

      return {
        status: 200,
        jsonBody: { availableSlots }
      };
    } catch (error) {
      context.error('Error fetching availability:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch availability' }
      };
    }
  }
});

app.http('createAppointment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'appointments',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      // Authenticate
      const auth = authenticateToken(request);
      if (!auth.authenticated) {
        return {
          status: 401,
          jsonBody: { error: auth.error }
        };
      }

      const body = await request.json();
      const { serviceId, stylistId, date, time, notes } = body;

      if (!serviceId || !date || !time) {
        return {
          status: 400,
          jsonBody: { error: 'Service, date, and time are required' }
        };
      }

      // Get user details
      const user = await getUserByEmail(auth.user.email);
      
      // Get service details
      const services = await getAllServices();
      const service = services.find(s => s.rowKey === serviceId);

      // Create appointment
      const appointment = await createAppointment({
        customerEmail: user.email,
        customerName: user.name,
        customerPhone: user.phone,
        stylistId: stylistId === 'any' ? null : stylistId,
        serviceId,
        serviceName: service?.name || 'Unknown',
        appointmentDate: date,
        appointmentTime: time,
        notes: notes || ''
      });

      // Send confirmation (fire and forget)
      sendAppointmentConfirmation(appointment).catch(err => {
        context.error('Failed to send confirmation:', err);
      });

      return {
        status: 201,
        jsonBody: {
          message: 'Appointment created successfully',
          appointment
        }
      };
    } catch (error) {
      context.error('Error creating appointment:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to create appointment' }
      };
    }
  }
});

app.http('getMyAppointments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'appointments/my-appointments',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      // Authenticate
      const auth = authenticateToken(request);
      if (!auth.authenticated) {
        return {
          status: 401,
          jsonBody: { error: auth.error }
        };
      }

      const appointments = await getAppointmentsByCustomer(auth.user.email);

      return {
        status: 200,
        jsonBody: appointments
      };
    } catch (error) {
      context.error('Error fetching appointments:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch appointments' }
      };
    }
  }
});

app.http('getStylistAppointments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'appointments/stylist-appointments',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      // Authenticate
      const auth = authenticateToken(request);
      if (!auth.authenticated) {
        return {
          status: 401,
          jsonBody: { error: auth.error }
        };
      }

      // Check authorization
      const roleCheck = requireRole(['stylist', 'admin'], auth.user);
      if (!roleCheck.authorized) {
        return {
          status: 403,
          jsonBody: { error: roleCheck.error }
        };
      }

      // Get user's stylist ID (or all for admin)
      const user = await getUserByEmail(auth.user.email);
      const stylistId = user.role === 'admin' ? null : user.stylistId;

      const appointments = await getAppointmentsByStylist(stylistId);

      return {
        status: 200,
        jsonBody: appointments
      };
    } catch (error) {
      context.error('Error fetching stylist appointments:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch appointments' }
      };
    }
  }
});

app.http('updateAppointment', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'appointments/{id}',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      // Authenticate
      const auth = authenticateToken(request);
      if (!auth.authenticated) {
        return {
          status: 401,
          jsonBody: { error: auth.error }
        };
      }

      // Check authorization
      const roleCheck = requireRole(['stylist', 'admin'], auth.user);
      if (!roleCheck.authorized) {
        return {
          status: 403,
          jsonBody: { error: roleCheck.error }
        };
      }

      const appointmentId = request.params.id;
      const body = await request.json();
      const { date, time, status, notes } = body;

      const updates = {};
      if (date) updates.appointmentDate = date;
      if (time) updates.appointmentTime = time;
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      if (Object.keys(updates).length === 0) {
        return {
          status: 400,
          jsonBody: { error: 'No fields to update' }
        };
      }

      await updateAppointment(appointmentId, updates);

      return {
        status: 200,
        jsonBody: { message: 'Appointment updated successfully' }
      };
    } catch (error) {
      context.error('Error updating appointment:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to update appointment' }
      };
    }
  }
});

app.http('deleteAppointment', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'appointments/{id}',
  handler: async (request, context) => {
    try {
      await ensureTablesExist();

      // Authenticate
      const auth = authenticateToken(request);
      if (!auth.authenticated) {
        return {
          status: 401,
          jsonBody: { error: auth.error }
        };
      }

      // Check authorization
      const roleCheck = requireRole(['stylist', 'admin'], auth.user);
      if (!roleCheck.authorized) {
        return {
          status: 403,
          jsonBody: { error: roleCheck.error }
        };
      }

      const appointmentId = request.params.id;
      await deleteAppointment(appointmentId);

      return {
        status: 200,
        jsonBody: { message: 'Appointment deleted successfully' }
      };
    } catch (error) {
      context.error('Error deleting appointment:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to delete appointment' }
      };
    }
  }
});
