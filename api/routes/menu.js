//used to send and retrieve server requests

import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /menu — fetch all menu items
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE available = TRUE');
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

// PUT /menu/:id — update a menu item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, photo_url, available } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE menu_items
       SET name = ?, description = ?, price = ?, category = ?, photo_url = ?, available = ?
       WHERE id = ?`,
      [name, description, price, category, photo_url, available, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update menu item' });
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
