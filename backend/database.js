// database.js
// Sets up the SQLite database, creates tables if they don't exist,
// and seeds demo accounts for the class manager and the 4 students.

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const db = new sqlite3.Database(DB_PATH);

// Demo accounts. CHANGE THESE LATER.
const DEMO_USERS = [
  {
    name: 'Mr. Abdulmalik Muhammad Yahaya',
    email: 'manager@rayhaan.edu',
    password: 'manager123',
    role: 'manager',
    profile_image: 'images/abdulmalik.jpg'
  },
  {
    name: 'Maryam',
    email: 'maryam@rayhaan.edu',
    password: 'maryam123',
    role: 'student',
    profile_image: 'images/maryam.jpg'
  },
  {
    name: 'Fatima',
    email: 'fatima@rayhaan.edu',
    password: 'fatima123',
    role: 'student',
    profile_image: 'images/fatima.jpg'
  },
  {
    name: 'Safiyya',
    email: 'safiyya@rayhaan.edu',
    password: 'safiyya123',
    role: 'student',
    profile_image: 'images/safiyya.jpg'
  },
  {
    name: 'Juwairiyya',
    email: 'juwairiyya@rayhaan.edu',
    password: 'juwairiyya123',
    role: 'student',
    profile_image: 'images/juwairiyya.jpg'
  }
];

function init() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student','manager')),
        profile_image TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'present',
        UNIQUE(student_id, date),
        FOREIGN KEY(student_id) REFERENCES users(id)
      )
    `);

    // Seed demo users only if the users table is empty
    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
      if (err) {
        console.error('Error checking users table:', err);
        return;
      }
      if (row.count === 0) {
        console.log('Seeding demo accounts...');
        const stmt = db.prepare(
          'INSERT INTO users (name, email, password_hash, role, profile_image) VALUES (?, ?, ?, ?, ?)'
        );
        DEMO_USERS.forEach((u) => {
          const hash = bcrypt.hashSync(u.password, 10);
          stmt.run(u.name, u.email, hash, u.role, u.profile_image);
        });
        stmt.finalize(() => {
          console.log('Demo accounts created.');
        });
      }
    });
  });
}

module.exports = { db, init };
