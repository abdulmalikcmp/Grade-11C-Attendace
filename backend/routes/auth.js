// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');

const router = express.Router();

const ALLOWED_STUDENT_NAMES = ['Maryam', 'Fatima', 'Safiyya', 'Juwairiyya'];

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!['student', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (role === 'student' && !ALLOWED_STUDENT_NAMES.includes(name)) {
    return res.status(400).json({
      error: `Student name must be one of: ${ALLOWED_STUDENT_NAMES.join(', ')}`
    });
  }

  const hash = bcrypt.hashSync(password, 10);
  const profileImage =
    role === 'manager' ? 'images/abdulmalik.jpg' : `images/${name.toLowerCase()}.jpg`;

  db.run(
    'INSERT INTO users (name, email, password_hash, role, profile_image) VALUES (?, ?, ?, ?, ?)',
    [name, email.toLowerCase().trim(), hash, role, profileImage],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Server error creating account.' });
      }
      req.session.userId = this.lastID;
      req.session.role = role;
      res.json({ success: true, user: { id: this.lastID, name, email, role, profile_image: profileImage } });
    }
  );
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error.' });
    }
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me — returns the currently logged-in user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  db.get(
    'SELECT id, name, email, role, profile_image FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'Not logged in.' });
      res.json({ user });
    }
  );
});

// POST /api/auth/reset-password
// A real "forgot password" flow needs an email service, which is out of scope
// for a beginner local project. Instead, the class manager can reset any
// student's password from the Manager Dashboard.
router.post('/reset-password', (req, res) => {
  if (!req.session.userId || req.session.role !== 'manager') {
    return res.status(403).json({ error: 'Only the class manager can reset passwords.' });
  }
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Valid email and a password of at least 6 characters are required.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.run(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hash, email.toLowerCase().trim()],
    function (err) {
      if (err) return res.status(500).json({ error: 'Server error.' });
      if (this.changes === 0) return res.status(404).json({ error: 'No account with that email.' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
