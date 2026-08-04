// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import menuRoutes from './routes/menu.js';
import uploadRoutes from './routes/upload.js';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, 'public');

const app = express();

// Simple request logger
app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.originalUrl);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET, // consider fallback in dev
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// Auth middleware: unchanged behavior
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Redirect to login page in /admin folder
  return res.redirect('/admin/admin-login.html');
}

app.use((req, res, next) => {
  const host = req.headers.host || '';

  // If request is to www, redirect to non-www
  if (host.startsWith('www.')) {
    const newHost = host.replace(/^www\./, '');
    return res.redirect(301, `https://${newHost}${req.originalUrl}`);
  }

  next();
});
/*
  === Routing & static file ordering ===

  Goal:
    - Serve general public assets quickly (CSS/JS/images).
    - Protect everything under /admin except the login page + its static dependencies.

  Implementation:
    - Mount a special middleware at /admin that allows the login page and static asset requests
      to pass through. For other /admin requests, run requireAuth first.
    - After that admin-specific mount, mount the global express.static(publicPath) so other assets
      and index.html are served as usual.
*/

// Root redirect (keeps previous behavior)
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Auth endpoints (login / logout)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.loggedIn = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid'); // default name for express-session
    res.json({ success: true });
  });
});

// Mount API routes BEFORE static so they are always handled by Express
app.use('/menu', menuRoutes);
app.use('/upload', uploadRoutes);

// Contact form
app.post('/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // validations
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    await transporter.sendMail({
      from: `"Taco Tom's Website" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      replyTo: email,
      subject: `Contact form: ${subject}`,
      text: `
      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'N/A'}

      Message:
      ${message}
            `
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending contact email:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/* ============================
   Admin protection + static
   ============================
   We mount this BEFORE the global express.static(publicPath) so we can intercept
   /admin/* requests and require auth where needed.
*/
app.use(
  '/admin',
  (req, res, next) => {
    // Allow the admin login page to be public:
    if (req.path === '/admin-login.html' || req.path === '/admin-login') {
      return next();
    }

    // Allow static asset requests (so login page's CSS/JS/images can load)
    // This checks typical static extensions; extend if you use other types.
    if (req.method === 'GET' && /\.(css|js|png|jpg|jpeg|svg|gif|woff2?|map|ico)$/i.test(req.path)) {
      return next();
    }

    // Otherwise require auth for /admin/*
    return requireAuth(req, res, next);
  },
  express.static(path.join(publicPath, 'admin'))
);

// Serve general public assets (CSS/JS/images/index.html etc.)
app.use(express.static(publicPath));

// EMAIL VALIDATION (kept unchanged)
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});