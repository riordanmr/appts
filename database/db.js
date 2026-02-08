const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'appointments.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initialize() {
  // Users table (customers and stylists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'stylist', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      active INTEGER DEFAULT 1
    )
  `);

  // Stylists table (references users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stylists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      bio TEXT,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      stylist_id INTEGER,
      service_id INTEGER NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
      notes TEXT,
      reminder_sent INTEGER DEFAULT 0,
      day_before_reminder_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (stylist_id) REFERENCES stylists(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  // Insert default services
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
  if (serviceCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name, description, duration_minutes, price)
      VALUES (?, ?, ?, ?)
    `);

    insertService.run('Haircut', 'Standard haircut and styling', 60, 35.00);
    insertService.run('Coloring', 'Full hair coloring service', 120, 85.00);
    insertService.run('Highlights', 'Partial highlights', 90, 65.00);
    insertService.run('Haircut & Style', 'Haircut with advanced styling', 75, 45.00);
    insertService.run('Wash & Blow Dry', 'Hair wash and blow dry', 30, 25.00);

    console.log('Default services inserted');
  }

  // Create default admin user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
  if (userCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    db.prepare(`
      INSERT INTO users (email, phone, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin@salon.com', '+1234567890', hashedPassword, 'Admin User', 'admin');

    console.log('Default admin user created (email: admin@salon.com, password: admin123)');
  }

  console.log('Database initialized successfully');
}

module.exports = {
  db,
  initialize
};
