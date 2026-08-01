import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import menuRoutes from './routes/menu.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, '..', 'public');

const app = express();

app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.originalUrl);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET, //can add secret fallback here
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// Auth middleware
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

// Root
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Auth routes
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
    res.json({ success: true });
  });
});

// Admin pages
// Login page (public)
app.get('/admin/admin-login.html', (req, res) => {
  res.sendFile('admin-login.html', { root: path.join(publicPath, 'admin') });
});

// Admin dashboard (protected)
app.get('/admin/admin.html', requireAuth, (req, res) => {
  res.sendFile('admin.html', { root: path.join(publicPath, 'admin') });
});

// Protected API routes
app.use('/menu', menuRoutes);
app.use('/upload', uploadRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});