// routes/attendance.js
const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Helper: require login
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in.' });
  next();
}

// Helper: require manager
function requireManager(req, res, next) {
  if (req.session.role !== 'manager') {
    return res.status(403).json({ error: 'Only the class manager can access this.' });
  }
  next();
}

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeString() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// POST /api/attendance/mark — a student marks HERSELF present today
router.post('/mark', requireLogin, (req, res) => {
  if (req.session.role !== 'student') {
    return res.status(403).json({ error: 'Only students can mark their own attendance.' });
  }
  const studentId = req.session.userId; // always self — never trust a client-supplied id
  const date = todayDateString();
  const time = timeString();

  db.get(
    'SELECT * FROM attendance WHERE student_id = ? AND date = ?',
    [studentId, date],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'Server error.' });
      if (existing) {
        return res.status(409).json({ error: 'You have already marked attendance for today.' });
      }
      db.run(
        'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
        [studentId, date, time, 'present'],
        function (err2) {
          if (err2) return res.status(500).json({ error: 'Server error.' });
          res.json({ success: true, date, time, status: 'present' });
        }
      );
    }
  );
});

// GET /api/attendance/me — the logged-in student's own record + today's status
router.get('/me', requireLogin, (req, res) => {
  if (req.session.role !== 'student') {
    return res.status(403).json({ error: 'Students only.' });
  }
  const studentId = req.session.userId;
  const today = todayDateString();

  db.all(
    'SELECT date, time, status FROM attendance WHERE student_id = ? ORDER BY date DESC',
    [studentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Server error.' });
      const todayRecord = rows.find((r) => r.date === today) || null;
      res.json({ history: rows, today: todayRecord });
    }
  );
});

// GET /api/attendance/roster — any logged-in user: all students + today's status
router.get('/roster', requireLogin, (req, res) => {
  const today = todayDateString();
  const sql = `
    SELECT u.id AS student_id, u.name, u.profile_image,
           a.time, a.status
    FROM users u
    LEFT JOIN attendance a ON a.student_id = u.id AND a.date = ?
    WHERE u.role = 'student'
    ORDER BY u.name ASC
  `;
  db.all(sql, [today], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Server error.' });
    const result = rows.map((r) => ({
      student_id: r.student_id,
      name: r.name,
      profile_image: r.profile_image,
      time: r.time || null,
      status: r.status || 'absent'
    }));
    res.json({ date: today, students: result });
  });
});

// GET /api/attendance/today — manager: today's status for all students
router.get('/today', requireLogin, requireManager, (req, res) => {
  const today = todayDateString();
  const sql = `
    SELECT u.id AS student_id, u.name, u.profile_image,
           a.time, a.status
    FROM users u
    LEFT JOIN attendance a ON a.student_id = u.id AND a.date = ?
    WHERE u.role = 'student'
    ORDER BY u.name ASC
  `;
  db.all(sql, [today], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Server error.' });
    const result = rows.map((r) => ({
      student_id: r.student_id,
      name: r.name,
      profile_image: r.profile_image,
      date: today,
      time: r.time || null,
      status: r.status || 'absent'
    }));
    res.json({ date: today, students: result });
  });
});

// GET /api/attendance/history?date=YYYY-MM-DD — manager: full table, optionally filtered by date
router.get('/history', requireLogin, requireManager, (req, res) => {
  const { date } = req.query;
  let sql = `
    SELECT u.name, a.date, a.time, a.status
    FROM attendance a
    JOIN users u ON u.id = a.student_id
  `;
  const params = [];
  if (date) {
    sql += ' WHERE a.date = ?';
    params.push(date);
  }
  sql += ' ORDER BY a.date DESC, u.name ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Server error.' });
    res.json({ records: rows });
  });
});

// GET /api/attendance/stats — manager: attendance percentage per student
router.get('/stats', requireLogin, requireManager, (req, res) => {
  const sql = `
    SELECT u.id, u.name,
           COUNT(a.id) AS days_present
    FROM users u
    LEFT JOIN attendance a ON a.student_id = u.id AND a.status = 'present'
    WHERE u.role = 'student'
    GROUP BY u.id, u.name
    ORDER BY u.name ASC
  `;
  db.get('SELECT COUNT(DISTINCT date) AS total_days FROM attendance', [], (err, totalsRow) => {
    if (err) return res.status(500).json({ error: 'Server error.' });
    const totalDays = totalsRow.total_days || 0;

    db.all(sql, [], (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Server error.' });
      const stats = rows.map((r) => ({
        id: r.id,
        name: r.name,
        days_present: r.days_present,
        total_days: totalDays,
        percentage: totalDays > 0 ? Math.round((r.days_present / totalDays) * 100) : 0
      }));
      res.json({ stats });
    });
  });
});

module.exports = router;
