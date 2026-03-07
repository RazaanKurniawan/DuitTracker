const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * tags:
 *   name: Tabungan
 *   description: API untuk target tabungan / financial goals
 */

/**
 * @swagger
 * /api/tabungan:
 *   get:
 *     summary: Ambil semua target tabungan
 *     tags: [Tabungan]
 *     responses:
 *       200:
 *         description: Array target tabungan
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tabungan WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/tabungan:
 *   post:
 *     summary: Buat target tabungan baru
 *     tags: [Tabungan]
 */
router.post('/', async (req, res) => {
  const { nama, target_jumlah, ikon, warna, target_tanggal, catatan } = req.body;
  if (!nama || !target_jumlah) {
    return res.status(400).json({ error: 'Nama dan target jumlah wajib diisi' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO tabungan (user_id, nama, target_jumlah, ikon, warna, target_tanggal, catatan)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, nama, target_jumlah, ikon || '🎯', warna || '#4361EE', target_tanggal || null, catatan || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/tabungan/{id}:
 *   put:
 *     summary: Update target tabungan
 *     tags: [Tabungan]
 */
router.put('/:id', async (req, res) => {
  const { nama, target_jumlah, ikon, warna, target_tanggal, catatan, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tabungan SET nama=$1, target_jumlah=$2, ikon=$3, warna=$4, target_tanggal=$5, catatan=$6, is_active=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [nama, target_jumlah, ikon, warna, target_tanggal || null, catatan || null, is_active !== undefined ? is_active : true, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tabungan tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/tabungan/{id}/setor:
 *   post:
 *     summary: Setor / tambah saldo ke tabungan
 *     tags: [Tabungan]
 */
router.post('/:id/setor', async (req, res) => {
  const { jumlah, dompet_id } = req.body;
  if (!jumlah || jumlah <= 0) {
    return res.status(400).json({ error: 'Jumlah setoran harus lebih dari 0' });
  }
  if (!dompet_id) {
    return res.status(400).json({ error: 'Pilih dompet sumber dana' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Update tabungan
    const { rows } = await client.query(
      `UPDATE tabungan SET terkumpul = terkumpul + $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [jumlah, req.params.id, req.user.id]
    );
    if (rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Tabungan tidak ditemukan' }); }
    // Create pengeluaran transaction from dompet
    await client.query(
      `INSERT INTO transaksi (user_id, dompet_id, tipe, jumlah, keterangan, tanggal)
       VALUES ($1, $2, 'pengeluaran', $3, $4, CURRENT_DATE)`,
      [req.user.id, dompet_id, jumlah, `[Tabungan→${rows[0].nama}] Setor tabungan`]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/tabungan/{id}/tarik:
 *   post:
 *     summary: Tarik saldo dari tabungan
 *     tags: [Tabungan]
 */
router.post('/:id/tarik', async (req, res) => {
  const { jumlah, dompet_id } = req.body;
  if (!jumlah || jumlah <= 0) {
    return res.status(400).json({ error: 'Jumlah penarikan harus lebih dari 0' });
  }
  if (!dompet_id) {
    return res.status(400).json({ error: 'Pilih dompet tujuan' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check current balance
    const check = await client.query('SELECT * FROM tabungan WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Tabungan tidak ditemukan' }); }
    if (parseFloat(check.rows[0].terkumpul) < jumlah) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Saldo tabungan tidak cukup' });
    }
    // Update tabungan
    const { rows } = await client.query(
      `UPDATE tabungan SET terkumpul = terkumpul - $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [jumlah, req.params.id, req.user.id]
    );
    // Create pemasukan transaction to dompet
    await client.query(
      `INSERT INTO transaksi (user_id, dompet_id, tipe, jumlah, keterangan, tanggal)
       VALUES ($1, $2, 'pemasukan', $3, $4, CURRENT_DATE)`,
      [req.user.id, dompet_id, jumlah, `[Tabungan←${check.rows[0].nama}] Tarik tabungan`]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/tabungan/{id}:
 *   delete:
 *     summary: Hapus target tabungan
 *     tags: [Tabungan]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM tabungan WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Tabungan tidak ditemukan' });
    res.json({ message: 'Tabungan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
