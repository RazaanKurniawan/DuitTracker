const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all anggaran for a specific month and year, including total terpakai
router.get('/', async (req, res) => {
  const { bulan, tahun } = req.query;
  
  if (!bulan || !tahun) {
    return res.status(400).json({ error: 'Parameter bulan dan tahun diwajibkan' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.kategori_id,
        k.nama as nama_kategori,
        k.ikon as ikon_kategori,
        a.bulan,
        a.tahun,
        a.batas_jumlah,
        COALESCE(SUM(t.jumlah), 0) as terpakai
      FROM anggaran a
      JOIN kategori k ON a.kategori_id = k.id
      LEFT JOIN transaksi t ON 
        t.kategori_id = a.kategori_id 
        AND t.user_id = $3
        AND EXTRACT(MONTH FROM t.tanggal) = $1
        AND EXTRACT(YEAR FROM t.tanggal) = $2
        AND t.tipe = 'pengeluaran'
      WHERE a.bulan = $1 AND a.tahun = $2 AND a.user_id = $3
      GROUP BY a.id, k.nama, k.ikon
      ORDER BY k.nama ASC
    `, [bulan, tahun, req.user.id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching anggaran:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST new anggaran
router.post('/', async (req, res) => {
  const { kategori_id, bulan, tahun, batas_jumlah } = req.body;
  if (!kategori_id || !bulan || !tahun || !batas_jumlah) {
    return res.status(400).json({ error: 'Semua field (kategori_id, bulan, tahun, batas_jumlah) harus diisi' });
  }

  try {
    // Upsert logic: if already exists for this category, month, year -> update it
    const result = await pool.query(`
      INSERT INTO anggaran (user_id, kategori_id, bulan, tahun, batas_jumlah)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, kategori_id, bulan, tahun) 
      DO UPDATE SET batas_jumlah = EXCLUDED.batas_jumlah, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.id, kategori_id, bulan, tahun, batas_jumlah]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating/updating anggaran:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update anggaran (if updating by ID instead of Upsert)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { batas_jumlah } = req.body;
  
  if (!batas_jumlah) {
    return res.status(400).json({ error: 'batas_jumlah harus diisi' });
  }

  try {
    const result = await pool.query(
      'UPDATE anggaran SET batas_jumlah = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [batas_jumlah, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anggaran tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating anggaran:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE anggaran
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM anggaran WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anggaran tidak ditemukan' });
    }
    
    res.json({ message: 'Anggaran berhasil dihapus', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting anggaran:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
