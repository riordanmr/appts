const { TableClient } = require('@azure/data-tables');

// Table clients
let usersTable;
let servicesTable;
let stylistsTable;
let appointmentsTable;

function initializeTableClients() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is required');
  }

  usersTable = TableClient.fromConnectionString(connectionString, 'users');
  servicesTable = TableClient.fromConnectionString(connectionString, 'services');
  stylistsTable = TableClient.fromConnectionString(connectionString, 'stylists');
  appointmentsTable = TableClient.fromConnectionString(connectionString, 'appointments');
}

async function ensureTablesExist() {
  if (!usersTable) {
    initializeTableClients();
  }

  await Promise.all([
    usersTable.createTable().catch(() => {}),  // Ignore if already exists
    servicesTable.createTable().catch(() => {}),
    stylistsTable.createTable().catch(() => {}),
    appointmentsTable.createTable().catch(() => {})
  ]);

  // Initialize default services if table is empty
  await initializeDefaultServices();
}

async function initializeDefaultServices() {
  const servicesIterator = servicesTable.listEntities({ queryOptions: { filter: "active eq true" } });
  let hasServices = false;
  
  for await (const _ of servicesIterator) {
    hasServices = true;
    break;
  }

  if (!hasServices) {
    const defaultServices = [
      { name: 'Haircut', description: 'Standard haircut and styling', durationMinutes: 60, price: 35.00, active: true },
      { name: 'Coloring', description: 'Full hair coloring service', durationMinutes: 120, price: 85.00, active: true },
      { name: 'Highlights', description: 'Partial highlights', durationMinutes: 90, price: 65.00, active: true },
      { name: 'Haircut & Style', description: 'Haircut with advanced styling', durationMinutes: 75, price: 45.00, active: true },
      { name: 'Wash & Blow Dry', description: 'Hair wash and blow dry', durationMinutes: 30, price: 25.00, active: true }
    ];

    for (let i = 0; i < defaultServices.length; i++) {
      const service = defaultServices[i];
      await servicesTable.createEntity({
        partitionKey: 'SERVICE',
        rowKey: `service-${i + 1}`,
        ...service
      });
    }
  }
}

// Helper functions for CRUD operations
async function createUser(user) {
  const entity = {
    partitionKey: 'USER',
    rowKey: user.email,
    ...user,
    createdAt: new Date().toISOString()
  };
  return await usersTable.createEntity(entity);
}

async function getUserByEmail(email) {
  try {
    return await usersTable.getEntity('USER', email);
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function createAppointment(appointment) {
  const appointmentId = `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entity = {
    partitionKey: 'APPOINTMENT',
    rowKey: appointmentId,
    ...appointment,
    createdAt: new Date().toISOString(),
    status: appointment.status || 'scheduled',
    reminderSent: false,
    dayBeforeReminderSent: false
  };
  await appointmentsTable.createEntity(entity);
  return { id: appointmentId, ...entity };
}

async function getAppointmentsByCustomer(customerEmail) {
  const appointments = [];
  const iterator = appointmentsTable.listEntities({
    queryOptions: { filter: `partitionKey eq 'APPOINTMENT' and customerEmail eq '${customerEmail}'` }
  });
  
  for await (const appointment of iterator) {
    appointments.push(appointment);
  }
  
  return appointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
}

async function getAppointmentsByStylist(stylistId) {
  const appointments = [];
  const filter = stylistId 
    ? `partitionKey eq 'APPOINTMENT' and stylistId eq '${stylistId}'`
    : `partitionKey eq 'APPOINTMENT'`;
    
  const iterator = appointmentsTable.listEntities({ queryOptions: { filter } });
  
  for await (const appointment of iterator) {
    appointments.push(appointment);
  }
  
  return appointments.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
}

async function updateAppointment(appointmentId, updates) {
  const existing = await appointmentsTable.getEntity('APPOINTMENT', appointmentId);
  const updated = { ...existing, ...updates };
  return await appointmentsTable.updateEntity(updated, 'Replace');
}

async function deleteAppointment(appointmentId) {
  return await appointmentsTable.deleteEntity('APPOINTMENT', appointmentId);
}

async function getAvailableSlots(date, serviceId, stylistId) {
  // Get service to know duration
  const service = await servicesTable.getEntity('SERVICE', serviceId);
  
  // Generate all possible slots
  const startHour = parseInt(process.env.BUSINESS_HOURS_START || 9);
  const endHour = parseInt(process.env.BUSINESS_HOURS_END || 18);
  const allSlots = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }

  // Get booked appointments for that date
  const filter = stylistId && stylistId !== 'any'
    ? `partitionKey eq 'APPOINTMENT' and appointmentDate eq '${date}' and stylistId eq '${stylistId}' and status eq 'scheduled'`
    : `partitionKey eq 'APPOINTMENT' and appointmentDate eq '${date}' and status eq 'scheduled'`;
  
  const bookedSlots = new Set();
  const iterator = appointmentsTable.listEntities({ queryOptions: { filter } });
  
  for await (const appointment of iterator) {
    const time = appointment.appointmentTime.substring(0, 5);
    bookedSlots.add(time);
  }

  // Filter out booked slots
  return allSlots.filter(slot => !bookedSlots.has(slot));
}

async function getAllServices() {
  const services = [];
  const iterator = servicesTable.listEntities({
    queryOptions: { filter: "partitionKey eq 'SERVICE' and active eq true" }
  });
  
  for await (const service of iterator) {
    services.push(service);
  }
  
  return services;
}

async function getAllStylists() {
  const stylists = [];
  const iterator = stylistsTable.listEntities({
    queryOptions: { filter: "partitionKey eq 'STYLIST' and active eq true" }
  });
  
  for await (const stylist of iterator) {
    stylists.push(stylist);
  }
  
  return stylists;
}

async function createStylist(stylist) {
  const stylistId = `stylist-${Date.now()}`;
  const entity = {
    partitionKey: 'STYLIST',
    rowKey: stylistId,
    ...stylist,
    active: true
  };
  await stylistsTable.createEntity(entity);
  return { id: stylistId, ...entity };
}

async function getAppointmentsForReminder(date) {
  const appointments = [];
  const filter = `partitionKey eq 'APPOINTMENT' and appointmentDate eq '${date}' and status eq 'scheduled' and dayBeforeReminderSent eq false`;
  const iterator = appointmentsTable.listEntities({ queryOptions: { filter } });
  
  for await (const appointment of iterator) {
    appointments.push(appointment);
  }
  
  return appointments;
}

module.exports = {
  ensureTablesExist,
  createUser,
  getUserByEmail,
  createAppointment,
  getAppointmentsByCustomer,
  getAppointmentsByStylist,
  updateAppointment,
  deleteAppointment,
  getAvailableSlots,
  getAllServices,
  getAllStylists,
  createStylist,
  getAppointmentsForReminder
};
