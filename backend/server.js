// server.js
// Entry point for the Grade 11C Attendance System.

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const { init } = require('./database');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// The frontend's deployed URL (your Netlify site), e.g. https://grade11c.netlify.app
// Set this as an environment variable on your backend host. Comma-separate
// multiple origins if needed. Falls back to allowing any origin for local dev.
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Set up the database (creates tables + seeds demo accounts on first run)
init();

// Needed so secure cookies work correctly behind Render's proxy
if (isProduction) app.set('trust proxy', 1);

// --- Middleware ---
app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true // required so the browser sends/receives the session cookie
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'rayhaan-model-academy-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      // Cross-site cookies (frontend on Netlify, backend on Render) require
      // SameSite=None + Secure, which only works over HTTPS — i.e. in production.
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    }
  })
);

// Serve the frontend (and its images/ subfolder) as static files.
// This also lets the whole app run from ONE server for local development,
// even though in production the frontend is served separately by Netlify.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);

// Fallback: any unknown route goes to the login page
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\nRayhaan Model Academy — Grade 11C Attendance System`);
  console.log(`Server running at: http://localhost:${PORT}\n`);
});
