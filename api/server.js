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

// If your app is behind a proxy (Fly, Heroku, nginx), trust proxy so req.protocol and
// x-forwarded-* headers are honored.
app.set('trust proxy', true);

// Simple request logger
app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.originalUrl, 'protocol=', req.protocol, 'host=', req.headers.host);
  next();
});

// Middleware
app.use(cors());




// Increase body-parser limits so uploads / big JSON do not get rejected by express
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Session cookie configuration
const isProd = process.env.NODE_ENV === 'production';
const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd, // only send cookie over HTTPS in production
  sameSite: 'lax', // allows top-level POST from same site but prevents most CSRF
  maxAge: 1000 * 60 * 60 * 2 // 2 hours
};

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions
  })
);

// debug middleware — MUST run after session() so req.session & req.sessionID exist
app.use((req, res, next) => {
  try {
    console.log(
      'REQ:',
      req.method,
      req.originalUrl,
      'pid=', process.pid,
      'sid=', req.sessionID,
      'loggedIn=', !!req.session?.loggedIn,
      'host=', req.headers.host,
      'protocol=', req.protocol,
      'secure=', req.secure,
      'cookies=', req.headers.cookie || '(none)'
    );
  } catch (err) {
    console.error('Debug middleware error', err);
  }
  next();
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Redirect to login page in /admin folder (no host change here)
  return res.redirect('/admin/admin-login.html');
}

/*
  HTTPS / host normalization middleware
  - We trust proxy above, so req.secure and req.headers['x-forwarded-proto'] are correct.
  - If incoming request is not HTTPS, redirect to https.
  - Use 301 for safe GET/HEAD redirects, use 308 for other methods to preserve method+body.
  - Additionally remove a leading "www." if present in host.
*/
app.use((req, res, next) => {
  try {
    const host = req.headers.host || '';
    let targetHost = host;

    // strip www. if present
    if (host.startsWith('www.')) {
      targetHost = host.replace(/^www\./, '');
    }

    // Determine if request is secure (works with proxies because 'trust proxy' is true)
    const isSecure = req.secure || (req.headers['x-forwarded-proto'] || '').includes('https');

    if (!isSecure) {
      // Build target URL
      const targetUrl = `https://${targetHost}${req.originalUrl}`;

      // For GET/HEAD use 301 (or 302) to preserve semantics and caches
      if (req.method === 'GET' || req.method === 'HEAD') {
        console.log('Redirecting (GET/HEAD) to:', targetUrl);
        return res.redirect(301, targetUrl);
      } else {
        // For POST/PUT/etc preserve method and body with 308
        console.log('Redirecting (preserve method) to:', targetUrl);
        return res.redirect(308, targetUrl);
      }
    }

    // If host changed only by removing www, redirect to non-www but preserve scheme
    if (host !== targetHost) {
      const sameSchemeUrl = `${req.protocol}://${targetHost}${req.originalUrl}`;
      const status = (req.method === 'GET' || req.method === 'HEAD') ? 301 : 308;
      console.log('Redirecting host-only change to:', sameSchemeUrl);
      return res.redirect(status, sameSchemeUrl);
    }
  } catch (err) {
    console.error('HTTPS redirect middleware error', err);
    // continue even if this middleware has an error
  }

  next();
});

// Root redirect
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
    // return success JSON
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    // Clear cookie with same options as when it was set
    res.clearCookie('connect.sid', { ...sessionCookieOptions, path: '/' });
    if (err) return res.status(500).json({ error: 'Logout failed' });
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
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`
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
   - Mount the admin middleware to allow public access to the login page and static
     dependencies, otherwise require auth.
   - Serve admin static with caching for assets and no-store for HTML.
*/
app.use(
  '/admin',
  (req, res, next) => {
    // Allow login page without auth
    if (req.path === '/admin-login.html' || req.path === '/admin-login') {
      return next();
    }

    // Allow static asset requests without auth (typical extensions)
    if (
      req.method === 'GET' &&
      /\.(css|js|png|jpg|jpeg|svg|gif|woff2?|map|ico)$/i.test(req.path)
    ) {
      return next();
    }

    // Otherwise require auth
    return requireAuth(req, res, next);
  },
  // Set cache headers for admin static files; no-store for HTML
  express.static(path.join(publicPath, 'admin'), {
    maxAge: '7d',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (/\.(html|htm)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  })
);

// Serve general public assets (CSS/JS/images/index.html etc.)
// For public assets: heavy caching for static assets, no-store for HTML
app.use(express.static(publicPath, {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (/\.(html|htm)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

// EMAIL VALIDATION
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});