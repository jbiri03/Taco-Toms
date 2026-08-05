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

app.set('trust proxy', true);

app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.originalUrl, 'protocol=', req.protocol, 'host=', req.headers.host);
  next();
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

const isProd = process.env.NODE_ENV === 'production';
const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 2
};

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions
  })
);

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

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.redirect('/admin/admin-login.html');
}

app.use((req, res, next) => {
  try {
    const host = req.headers.host || '';
    let targetHost = host;

    if (host.startsWith('www.')) {
      targetHost = host.replace(/^www\./, '');
    }

    const isSecure = req.secure || (req.headers['x-forwarded-proto'] || '').includes('https');

    if (!isSecure) {
      const targetUrl = `https://${targetHost}${req.originalUrl}`;
      if (req.method === 'GET' || req.method === 'HEAD') {
        console.log('Redirecting (GET/HEAD) to:', targetUrl);
        return res.redirect(301, targetUrl);
      } else {
        console.log('Redirecting (preserve method) to:', targetUrl);
        return res.redirect(308, targetUrl);
      }
    }

    if (host !== targetHost) {
      const sameSchemeUrl = `${req.protocol}://${targetHost}${req.originalUrl}`;
      const status = (req.method === 'GET' || req.method === 'HEAD') ? 301 : 308;
      console.log('Redirecting host-only change to:', sameSchemeUrl);
      return res.redirect(status, sameSchemeUrl);
    }
  } catch (err) {
    console.error('HTTPS redirect middleware error', err);
  }

  next();
});

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;

    return req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, error: 'Login failed' });
      }

      return res.json({ success: true });
    });
  }

  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('connect.sid', { ...sessionCookieOptions, path: '/' });
    res.json({ success: true });
  });
});

app.get('/auth-check', (req, res) => {
  if (req.session?.loggedIn) {
    return res.json({ loggedIn: true });
  }
  return res.status(401).json({ loggedIn: false });
});

app.use('/menu', menuRoutes);
app.use('/upload', uploadRoutes);

app.post('/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

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

app.use(
  '/admin',
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

app.use('/uploads', express.static(path.join(publicPath, 'uploads'), {
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

app.use(express.static(publicPath, {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (/\.(html|htm)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});