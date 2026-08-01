// routes/menu.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db.js';

const router = express.Router();

// Multer setup (same as in upload.js)
const uploadDir = path.join(process.cwd(), '..','public', 'admin', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// GET /menu — fetch all menu items (used by admin)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// GET /menu/public — fetch only available items (used by public UI)
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM menu_items WHERE available = TRUE ORDER BY category, name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// POST /menu — add a new menu item
router.post('/', async (req, res) => {
  const { name, description, price, category, photo_url, available } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO menu_items (name, description, price, category, photo_url, available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, price, category, photo_url, available]
    );

    res.json({ id: result.insertId, message: 'Menu item added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// PUT /menu/:id/availability — update availability of a menu item
router.put('/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { available } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE menu_items SET available = ? WHERE id = ?`,
      [available, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Availability updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});


// PUT /menu/:id — update a menu item (with optional photo upload)
router.put('/:id', upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, available } = req.body;

  // If a photo is uploaded, use new photo_url; otherwise, keep existing
  const newPhoto = req.file ? 'admin/uploads/' + req.file.filename : null;

  try {
    if (newPhoto) {
      const [result] = await pool.query(
        `UPDATE menu_items
         SET name = ?, description = ?, price = ?, category = ?, photo_url = ?, available = ?
         WHERE id = ?`,
        [name, description, price, category, newPhoto, available, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      return res.json({ message: 'Menu item updated successfully', photo_url: newPhoto });
    } else {
      // No new photo – keep existing photo_url
      const [result] = await pool.query(
        `UPDATE menu_items
         SET name = ?, description = ?, price = ?, category = ?, available = ?
         WHERE id = ?`,
        [name, description, price, category, available, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      return res.json({ message: 'Menu item updated successfully' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// GET /menu/:id — fetch one menu item
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// DELETE /menu/:id — remove a menu item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM menu_items WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;