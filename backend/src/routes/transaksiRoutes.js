const express = require('express');
const pool = require('../db');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Memory storage for import
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Disk storage for receipt photos
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `receipt-${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaksi:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         kategori_id:
 *           type: integer
 *           example: 6
 *         tipe:
 *           type: string
 *           enum: [pemasukan, pengeluaran]
 *           example: "pengeluaran"
 *         jumlah:
 *           type: number
 *           example: 50000
 *         keterangan:
 *           type: string
 *           example: "Makan siang di warteg"
 *         tanggal:
 *           type: string
 *           format: date
 *           example: "2026-03-06"
 *         created_at:
 *           type: string
 *           format: date-time
 *     Ringkasan:
 *       type: object
 *       properties:
 *         total_pemasukan:
 *           type: number
 *           example: 5000000
 *         total_pengeluaran:
 *           type: number
 *           example: 2500000
 *         saldo:
 *           type: number
 *           example: 2500000
 *         breakdown:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               kategori:
 *                 type: string
 *               ikon:
 *                 type: string
 *               tipe:
 *                 type: string
 *               total:
 *                 type: number
 */

/**
 * @swagger
 * /api/transaksi:
 *   get:
 *     summary: Ambil daftar transaksi dengan filter dan pagination
 *     tags: [Transaksi]
 *     parameters:
 *       - in: query
 *         name: bulan
 *         schema:
 *           type: integer
 *         description: "Filter bulan (1-12)"
 *       - in: query
 *         name: tahun
 *         schema:
 *           type: integer
 *         description: "Filter tahun"
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: "Pencarian keterangan"
 *       - in: query
 *         name: tipe
 *         schema:
 *           type: string
 *           enum: [pemasukan, pengeluaran]
 *         description: "Filter tipe"
 *       - in: query
 *         name: kategori_id
 *         schema:
 *           type: integer
 *         description: "Filter kategori"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Halaman (default 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Jumlah per halaman (default 10)"
 *     responses:
 *       200:
 *         description: Daftar transaksi beserta info pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaksi'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 */
router.get('/', async (req, res) => {
  const { bulan, tahun, q, tipe, kategori_id, dompet_id, page = 1, limit = 10 } = req.query;
  try {
    let whereClause = 'WHERE t.user_id = $1';
    const params = [req.user.id];
    let counter = 2;

    if (bulan && tahun) {
      whereClause += ` AND EXTRACT(MONTH FROM t.tanggal) = $${counter++} AND EXTRACT(YEAR FROM t.tanggal) = $${counter++}`;
      params.push(bulan, tahun);
    } else if (tahun) {
      whereClause += ` AND EXTRACT(YEAR FROM t.tanggal) = $${counter++}`;
      params.push(tahun);
    }

    if (q) {
      // Split by comma, trim spaces, remove empty strings
      const tags = q.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (tags.length > 0) {
        const tagConditions = tags.map(tag => {
          params.push(`%${tag}%`);
          return `t.keterangan ILIKE $${counter++}`;
        });
        whereClause += ` AND (${tagConditions.join(' OR ')})`;
      }
    }

    if (tipe) {
      whereClause += ` AND t.tipe = $${counter++}`;
      params.push(tipe);
    }

    if (kategori_id) {
      const ids = kategori_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        whereClause += ` AND t.kategori_id = ANY($${counter++}::int[])`;
        params.push(ids);
      }
    }

    if (dompet_id) {
      whereClause += ` AND t.dompet_id = $${counter++}`;
      params.push(dompet_id);
    }

    // Hitung total untuk pagination
    const countQuery = `SELECT COUNT(*) FROM transaksi t ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count);

    // Ambil data
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT t.*, k.nama as kategori_nama, k.ikon as kategori_ikon, 
             d.nama as dompet_nama, d.ikon as dompet_ikon, d.warna as dompet_warna
      FROM transaksi t
      LEFT JOIN kategori k ON t.kategori_id = k.id
      LEFT JOIN dompet d ON t.dompet_id = d.id
      ${whereClause}
      ORDER BY t.tanggal DESC, t.created_at DESC
      LIMIT $${counter++} OFFSET $${counter++}
    `;
    params.push(limit, offset);

    const { rows } = await pool.query(dataQuery, params);

    res.json({
      data: rows,
      pagination: {
        total: totalItems,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(totalItems / limit)
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tren bulanan (6 bulan terakhir)
router.get('/tren', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM t.tanggal)::int AS bulan,
        EXTRACT(YEAR FROM t.tanggal)::int AS tahun,
        COALESCE(SUM(CASE WHEN t.tipe = 'pemasukan' THEN t.jumlah ELSE 0 END), 0) AS total_pemasukan,
        COALESCE(SUM(CASE WHEN t.tipe = 'pengeluaran' THEN t.jumlah ELSE 0 END), 0) AS total_pengeluaran
      FROM transaksi t
      WHERE t.user_id = $1
        AND t.tanggal >= (CURRENT_DATE - INTERVAL '5 months')
        AND (t.keterangan NOT LIKE '[Transfer%' OR t.keterangan IS NULL)
        AND (t.keterangan NOT LIKE '[Tabungan%' OR t.keterangan IS NULL)
      GROUP BY tahun, bulan
      ORDER BY tahun ASC, bulan ASC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      bulan: r.bulan,
      tahun: r.tahun,
      total_pemasukan: Number.parseFloat(r.total_pemasukan),
      total_pengeluaran: Number.parseFloat(r.total_pengeluaran),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/transaksi/ringkasan:
 *   get:
 *     summary: Ambil ringkasan keuangan (total pemasukan, pengeluaran, saldo, breakdown)
 *     tags: [Transaksi]
 *     parameters:
 *       - in: query
 *         name: bulan
 *         schema:
 *           type: integer
 *         description: "Filter bulan (1-12)"
 *         example: 3
 *       - in: query
 *         name: tahun
 *         schema:
 *           type: integer
 *         description: "Filter tahun"
 *         example: 2026
 *     responses:
 *       200:
 *         description: Ringkasan keuangan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ringkasan'
 */
router.get('/ringkasan', async (req, res) => {
  const { bulan, tahun } = req.query;
  try {
    let whereClause = "WHERE t.user_id = $1 AND (t.keterangan NOT LIKE '[Transfer%' OR t.keterangan IS NULL) AND (t.keterangan NOT LIKE '[Tabungan%' OR t.keterangan IS NULL)";
    const params = [req.user.id];

    if (bulan && tahun) {
      whereClause += ' AND EXTRACT(MONTH FROM t.tanggal) = $2 AND EXTRACT(YEAR FROM t.tanggal) = $3';
      params.push(bulan, tahun);
    } else if (tahun) {
      whereClause += ' AND EXTRACT(YEAR FROM t.tanggal) = $2';
      params.push(tahun);
    }

    const totalsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN t.tipe = 'pemasukan' THEN t.jumlah ELSE 0 END), 0) as total_pemasukan,
        COALESCE(SUM(CASE WHEN t.tipe = 'pengeluaran' THEN t.jumlah ELSE 0 END), 0) as total_pengeluaran
      FROM transaksi t
      ${whereClause}
    `;
    const totals = await pool.query(totalsQuery, params);

    const breakdownQuery = `
      SELECT
        k.nama as kategori,
        k.ikon,
        t.tipe,
        COALESCE(SUM(t.jumlah), 0) as total
      FROM transaksi t
      LEFT JOIN kategori k ON t.kategori_id = k.id
      ${whereClause}
      GROUP BY k.nama, k.ikon, t.tipe
      ORDER BY total DESC
    `;
    const breakdown = await pool.query(breakdownQuery, params);

    const { total_pemasukan, total_pengeluaran } = totals.rows[0];
    res.json({
      total_pemasukan: parseFloat(total_pemasukan),
      total_pengeluaran: parseFloat(total_pengeluaran),
      saldo: parseFloat(total_pemasukan) - parseFloat(total_pengeluaran),
      breakdown: breakdown.rows.map(row => ({
        ...row,
        total: parseFloat(row.total)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/transaksi/{id}:
 *   get:
 *     summary: Ambil detail satu transaksi
 *     tags: [Transaksi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *     responses:
 *       200:
 *         description: Detail transaksi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaksi'
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, k.nama as kategori_nama, k.ikon as kategori_ikon,
              d.nama as dompet_nama, d.ikon as dompet_ikon, d.warna as dompet_warna
       FROM transaksi t
       LEFT JOIN kategori k ON t.kategori_id = k.id
       LEFT JOIN dompet d ON t.dompet_id = d.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/transaksi:
 *   post:
 *     summary: Tambah transaksi baru
 *     tags: [Transaksi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kategori_id, tipe, jumlah]
 *             properties:
 *               kategori_id:
 *                 type: integer
 *                 example: 6
 *               tipe:
 *                 type: string
 *                 enum: [pemasukan, pengeluaran]
 *                 example: "pengeluaran"
 *               jumlah:
 *                 type: number
 *                 example: 50000
 *               keterangan:
 *                 type: string
 *                 example: "Makan siang di warteg"
 *               tanggal:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-06"
 *     responses:
 *       201:
 *         description: Transaksi berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaksi'
 */
router.post('/', async (req, res) => {
  const { dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO transaksi (user_id, dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal || new Date()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/transaksi/{id}:
 *   put:
 *     summary: Update transaksi
 *     tags: [Transaksi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kategori_id:
 *                 type: integer
 *               tipe:
 *                 type: string
 *                 enum: [pemasukan, pengeluaran]
 *               jumlah:
 *                 type: number
 *               keterangan:
 *                 type: string
 *               tanggal:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Transaksi berhasil diupdate
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.put('/:id', async (req, res) => {
  const { dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE transaksi
       SET dompet_id = $1, kategori_id = $2, tipe = $3, jumlah = $4, keterangan = $5, tanggal = $6
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal, req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/transaksi/{id}:
 *   delete:
 *     summary: Hapus transaksi
 *     tags: [Transaksi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *     responses:
 *       200:
 *         description: Transaksi berhasil dihapus
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transaksi WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE bulk - hapus banyak transaksi sekaligus
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids harus berupa array dan tidak boleh kosong' });
    }
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await pool.query(
      `DELETE FROM transaksi WHERE id IN (${placeholders}) AND user_id = $1`,
      [req.user.id, ...ids]
    );
    res.json({ message: `${result.rowCount} transaksi berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload foto struk for a transaksi
router.post('/:id/foto', uploadDisk.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File foto wajib diupload' });
    const fotoPath = `/uploads/${req.file.filename}`;
    const { rows } = await pool.query(
      'UPDATE transaksi SET foto = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [fotoPath, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE foto struk
router.delete('/:id/foto', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE transaksi SET foto = NULL WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST import transaksi from CSV/Excel
router.post('/import', uploadMemory.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).json({ error: 'File wajib diupload' });

    const userId = req.user.id;
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let rows = [];

    if (ext === 'csv') {
      const text = req.file.buffer.toString('utf-8');
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return res.status(400).json({ error: 'File CSV kosong atau hanya header' });
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        header.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        rows.push(row);
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount < 2) return res.status(400).json({ error: 'File Excel kosong atau hanya header' });
      const header = [];
      sheet.getRow(1).eachCell((cell, colNum) => { header[colNum] = String(cell.value).trim().toLowerCase(); });
      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const obj = {};
        row.eachCell((cell, colNum) => { obj[header[colNum]] = cell.value; });
        if (Object.keys(obj).length > 0) rows.push(obj);
      });
    } else {
      return res.status(400).json({ error: 'Format file tidak didukung. Gunakan .csv atau .xlsx' });
    }

    // Load user's kategori and dompet for name matching
    const [kategoriRes, dompetRes] = await Promise.all([
      pool.query('SELECT id, nama, tipe FROM kategori WHERE user_id = $1', [userId]),
      pool.query('SELECT id, nama FROM dompet WHERE user_id = $1', [userId]),
    ]);
    const kategoriMap = {};
    kategoriRes.rows.forEach(k => { kategoriMap[k.nama.toLowerCase()] = k; });
    const dompetMap = {};
    dompetRes.rows.forEach(d => { dompetMap[d.nama.toLowerCase()] = d; });

    const defaultDompet = dompetRes.rows[0];
    let imported = 0;
    let skipped = 0;
    const errors = [];

    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const tipe = (r.tipe || '').toLowerCase();
      const jumlah = Number.parseFloat(r.jumlah);
      const keterangan = r.keterangan || '';
      const tanggal = r.tanggal || new Date().toISOString().split('T')[0];

      if (!tipe || !['pemasukan', 'pengeluaran'].includes(tipe) || !jumlah || jumlah <= 0) {
        skipped++;
        errors.push(`Baris ${i + 2}: tipe/jumlah tidak valid`);
        continue;
      }

      // Match kategori by name
      let kategoriId = null;
      if (r.kategori) {
        const k = kategoriMap[r.kategori.toLowerCase()];
        if (k) kategoriId = k.id;
      }

      // Match dompet by name
      let dompetId = defaultDompet?.id || null;
      if (r.dompet) {
        const d = dompetMap[r.dompet.toLowerCase()];
        if (d) dompetId = d.id;
      }

      await client.query(
        `INSERT INTO transaksi (user_id, dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, dompetId, kategoriId, tipe, jumlah, keterangan, tanggal]
      );
      imported++;
    }

    await client.query('COMMIT');

    res.json({
      message: `Import selesai: ${imported} transaksi berhasil, ${skipped} dilewati`,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Gagal import: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
