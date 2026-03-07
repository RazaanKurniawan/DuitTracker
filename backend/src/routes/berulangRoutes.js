const express = require('express');
const pool = require('../db');
const { processRecurringTransactions } = require('../cronJob');

const router = express.Router();

// GET all transaksi_berulang
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT tb.*, 
             k.nama as kategori_nama, k.ikon as kategori_ikon,
             d.nama as dompet_nama, d.ikon as dompet_ikon, d.warna as dompet_warna
      FROM transaksi_berulang tb
      LEFT JOIN kategori k ON tb.kategori_id = k.id
      LEFT JOIN dompet d ON tb.dompet_id = d.id
      WHERE tb.user_id = $1
      ORDER BY tb.created_at DESC
    `;
    const { rows } = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error mengambil transaksi berulang' });
  }
});

// GET single transaksi_berulang
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT tb.*, 
             k.nama as kategori_nama, k.ikon as kategori_ikon,
             d.nama as dompet_nama, d.ikon as dompet_ikon, d.warna as dompet_warna
      FROM transaksi_berulang tb
      LEFT JOIN kategori k ON tb.kategori_id = k.id
      LEFT JOIN dompet d ON tb.dompet_id = d.id
      WHERE tb.id = $1 AND tb.user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new transaksi_berulang
router.post('/', async (req, res) => {
  try {
    const { dompet_id, kategori_id, tipe, jumlah, keterangan, frekuensi, tanggal_mulai } = req.body;
    
    const { rows } = await pool.query(
      `INSERT INTO transaksi_berulang 
       (user_id, dompet_id, kategori_id, tipe, jumlah, keterangan, frekuensi, tanggal_mulai, tanggal_berikutnya) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
      [req.user.id, dompet_id, kategori_id, tipe, jumlah, keterangan, frekuensi, tanggal_mulai]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal menambah transaksi berulang' });
  }
});

// PUT update transaksi_berulang
router.put('/:id', async (req, res) => {
  try {
    const { dompet_id, kategori_id, tipe, jumlah, keterangan, frekuensi, tanggal_mulai } = req.body;
    const { id } = req.params;
    
    // We optionally resetting tanggal_berikutnya if tanggal_mulai changed.
    // For simplicity, we just update it dynamically based on the form 
    // assuming frontend will send the right next calculated date or user specifically asked to restart the schedule.
    // In this basic version we will just update everything user sent including tanggal_mulai as the next scheduled date.
    
    const { rows } = await pool.query(
      `UPDATE transaksi_berulang 
       SET dompet_id = $1, kategori_id = $2, tipe = $3, jumlah = $4, keterangan = $5, 
           frekuensi = $6, tanggal_mulai = $7, tanggal_berikutnya = $7
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [dompet_id, kategori_id, tipe, jumlah, keterangan, frekuensi, tanggal_mulai, id, req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal update transaksi berulang' });
  }
});

// PATCH toggle is_active
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        
        const { rows } = await pool.query(
          'UPDATE transaksi_berulang SET is_active = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
          [is_active, id, req.user.id]
        );
        
        if (rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Gagal update status' });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM transaksi_berulang WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({ message: 'Transaksi berulang berhasil dihapus' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal hapus data' });
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
      `DELETE FROM transaksi_berulang WHERE id IN (${placeholders}) AND user_id = $1`,
      [req.user.id, ...ids]
    );
    res.json({ message: `${result.rowCount} tagihan berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to manually trigger cron processing
router.post('/trigger-cron', async (req, res) => {
  try {
    await processRecurringTransactions();
    res.json({ message: 'Cron job berhasil dijalankan manual' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal menjalankan cron manual' });
  }
});

module.exports = router;
