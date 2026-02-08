const bcrypt = require('bcryptjs');
const { db } = require('./database/db');

/**
 * Script to add a stylist to the system
 * Usage: node add-stylist.js
 */

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function addStylist() {
  try {
    console.log('\n=== Add New Stylist ===\n');

    const name = await question('Enter stylist name: ');
    const email = await question('Enter email: ');
    const phone = await question('Enter phone number (+1234567890): ');
    const password = await question('Enter password: ');
    const bio = await question('Enter bio (optional): ');

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      console.error('Error: Email already exists');
      rl.close();
      return;
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert user
    const userResult = db.prepare(`
      INSERT INTO users (email, phone, password, name, role)
      VALUES (?, ?, ?, ?, 'stylist')
    `).run(email, phone, hashedPassword, name);

    // Insert stylist profile
    db.prepare(`
      INSERT INTO stylists (user_id, bio, active)
      VALUES (?, ?, 1)
    `).run(userResult.lastInsertRowid, bio || '');

    console.log('\n✅ Stylist added successfully!');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`They can now log in to the stylist portal.\n`);

  } catch (error) {
    console.error('Error adding stylist:', error);
  } finally {
    rl.close();
  }
}

// Initialize database first
require('./database/db').initialize();

// Run the script
addStylist();
