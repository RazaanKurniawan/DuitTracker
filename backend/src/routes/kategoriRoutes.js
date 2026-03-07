const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Kategori:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nama:
 *           type: string
 *           example: "Makanan"
 *         tipe:
 *           type: string
 *           enum: [pemasukan, pengeluaran]
 *           example: "pengeluaran"
 *         ikon:
 *           type: string
 *           example: "🍔"
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/kategori:
 *   get:
 *     summary: Ambil semua kategori
 *     tags: [Kategori]
 *     responses:
 *       200:
 *         description: Daftar semua kategori
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Kategori'
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM kategori WHERE user_id = $1 ORDER BY tipe, nama',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kategori:
 *   post:
 *     summary: Tambah kategori baru
 *     tags: [Kategori]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nama, tipe]
 *             properties:
 *               nama:
 *                 type: string
 *                 example: "Subscription"
 *               tipe:
 *                 type: string
 *                 enum: [pemasukan, pengeluaran]
 *                 example: "pengeluaran"
 *               ikon:
 *                 type: string
 *                 example: "📺"
 *     responses:
 *       201:
 *         description: Kategori berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Kategori'
 */
router.post('/', async (req, res) => {
  const { nama, tipe, ikon } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO kategori (user_id, nama, tipe, ikon) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, nama, tipe, ikon || '📁']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kategori/{id}:
 *   delete:
 *     summary: Hapus kategori
 *     tags: [Kategori]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kategori
 *     responses:
 *       200:
 *         description: Kategori berhasil dihapus
 */
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kategori WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE bulk
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids harus berupa array dan tidak boleh kosong' });
    }
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await pool.query(
      `DELETE FROM kategori WHERE id IN (${placeholders}) AND user_id = $1`,
      [req.user.id, ...ids]
    );
    res.json({ message: `${result.rowCount} kategori berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
