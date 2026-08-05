// routes/menu.js
import express from 'express';
import multer from 'multer';
import pool from '../db.js';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// Multer now keeps files in memory so nothing is written to local disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function uploadToR2(file) {
  const ext = file.originalname.split('.').pop() || 'jpg';
  const key = `menu/${crypto.randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );

  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
}

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

  try {
    if (req.file) {
      const newPhoto = await uploadToR2(req.file);

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