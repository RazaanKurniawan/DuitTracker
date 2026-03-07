const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET all dompet with calculated saldo
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, 
        d.nama, 
        d.saldo_awal, 
        d.ikon, 
        d.warna, 
        d.created_at,
        COALESCE(SUM(CASE WHEN t.tipe = 'pemasukan' THEN t.jumlah ELSE 0 END), 0) AS total_pemasukan,
        COALESCE(SUM(CASE WHEN t.tipe = 'pengeluaran' THEN t.jumlah ELSE 0 END), 0) AS total_pengeluaran,
        (d.saldo_awal + 
         COALESCE(SUM(CASE WHEN t.tipe = 'pemasukan' THEN t.jumlah ELSE 0 END), 0) - 
         COALESCE(SUM(CASE WHEN t.tipe = 'pengeluaran' THEN t.jumlah ELSE 0 END), 0)) AS saldo_saat_ini
      FROM dompet d
      LEFT JOIN transaksi t ON d.id = t.dompet_id
      WHERE d.user_id = $1
      GROUP BY d.id
      ORDER BY d.id ASC
    `;
    const { rows } = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error saat mengambil list dompet' });
  }
});

// GET single dompet by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        d.*,
        (d.saldo_awal + 
         COALESCE(SUM(CASE WHEN t.tipe = 'pemasukan' THEN t.jumlah ELSE 0 END), 0) - 
         COALESCE(SUM(CASE WHEN t.tipe = 'pengeluaran' THEN t.jumlah ELSE 0 END), 0)) AS saldo_saat_ini
      FROM dompet d
      LEFT JOIN transaksi t ON d.id = t.dompet_id
      WHERE d.id = $1 AND d.user_id = $2
      GROUP BY d.id
    `;
    const { rows } = await pool.query(query, [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new dompet
router.post('/', async (req, res) => {
  try {
    const { nama, saldo_awal = 0, ikon = '👛', warna = '#4361EE', mata_uang = 'IDR' } = req.body;
    
    if (!nama) {
      return res.status(400).json({ error: 'Nama dompet wajib diisi' });
    }

    const { rows } = await pool.query(
      'INSERT INTO dompet (user_id, nama, saldo_awal, ikon, warna, mata_uang) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, nama, saldo_awal, ikon, warna, mata_uang]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update dompet
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, saldo_awal, ikon, warna, mata_uang } = req.body;
    
    if (!nama) {
      return res.status(400).json({ error: 'Nama dompet wajib diisi' });
    }

    const { rows } = await pool.query(
      'UPDATE dompet SET nama = $1, saldo_awal = $2, ikon = $3, warna = $4, mata_uang = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
      [nama, saldo_awal || 0, ikon || '👛', warna || '#4361EE', mata_uang || 'IDR', id, req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST transfer antar dompet
router.post('/transfer', async (req, res) => {
  const client = await pool.connect();
  try {
    const { dari_dompet_id, ke_dompet_id, jumlah, keterangan, tanggal } = req.body;
    const userId = req.user.id;

    if (!dari_dompet_id || !ke_dompet_id || !jumlah) {
      return res.status(400).json({ error: 'dari_dompet_id, ke_dompet_id, dan jumlah wajib diisi' });
    }
    if (dari_dompet_id === ke_dompet_id) {
      return res.status(400).json({ error: 'Dompet asal dan tujuan tidak boleh sama' });
    }
    if (jumlah <= 0) {
      return res.status(400).json({ error: 'Jumlah transfer harus lebih dari 0' });
    }

    // Verify both wallets belong to user
    const dariDompet = await client.query('SELECT id, nama FROM dompet WHERE id = $1 AND user_id = $2', [dari_dompet_id, userId]);
    const keDompet = await client.query('SELECT id, nama FROM dompet WHERE id = $1 AND user_id = $2', [ke_dompet_id, userId]);
    if (dariDompet.rowCount === 0 || keDompet.rowCount === 0) {
      return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    }

    const tgl = tanggal || new Date();
    const note = keterangan || `Transfer dari ${dariDompet.rows[0].nama} ke ${keDompet.rows[0].nama}`;

    await client.query('BEGIN');

    // Pengeluaran dari dompet asal
    const { rows: [txOut] } = await client.query(
      `INSERT INTO transaksi (user_id, dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal)
       VALUES ($1, $2, NULL, 'pengeluaran', $3, $4, $5) RETURNING *`,
      [userId, dari_dompet_id, jumlah, `[Transfer→${keDompet.rows[0].nama}] ${note}`, tgl]
    );

    // Pemasukan ke dompet tujuan
    const { rows: [txIn] } = await client.query(
      `INSERT INTO transaksi (user_id, dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal)
       VALUES ($1, $2, NULL, 'pemasukan', $3, $4, $5) RETURNING *`,
      [userId, ke_dompet_id, jumlah, `[Transfer←${dariDompet.rows[0].nama}] ${note}`, tgl]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Transfer berhasil',
      pengeluaran: txOut,
      pemasukan: txIn,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error saat transfer' });
  } finally {
    client.release();
  }
});

// GET transfer history
router.get('/transfer/riwayat', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, d.nama as dompet_nama, d.ikon as dompet_ikon, d.warna as dompet_warna
       FROM transaksi t
       LEFT JOIN dompet d ON t.dompet_id = d.id
       WHERE t.user_id = $1 AND t.keterangan LIKE '[Transfer%'
       ORDER BY t.tanggal DESC, t.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE dompet
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if dompet has transactions
    const checkTx = await pool.query('SELECT id FROM transaksi WHERE dompet_id = $1 LIMIT 1', [id]);
    if (checkTx.rowCount > 0) {
      return res.status(400).json({ error: 'Dompet tidak dapat dihapus karena masih memiliki transaksi terkait.' });
    }

    const { rows } = await pool.query('DELETE FROM dompet WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    res.json({ message: 'Dompet berhasil dihapus', deleted: rows[0] });
  } catch (err) {
    console.error(err.message);
    
    if (err.code === '23503') { // Foreign key violation
        res.status(400).json({ error: 'Dompet tidak dapat dihapus karena masih digunakan.' });
    } else {
        res.status(500).json({ error: 'Server error' });
    }
  }
});

module.exports = router;
