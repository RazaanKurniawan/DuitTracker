const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const bulanNames = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Seed default kategori for a new user
async function seedKategoriForUser(client, userId) {
  await client.query(`
    INSERT INTO kategori (user_id, nama, tipe, ikon) VALUES
      ($1, 'Gaji',        'pemasukan',    '💰'),
      ($1, 'Freelance',   'pemasukan',    '💻'),
      ($1, 'Bonus',       'pemasukan',    '🎁'),
      ($1, 'Investasi',   'pemasukan',    '📈'),
      ($1, 'Lainnya',     'pemasukan',    '💵'),
      ($1, 'Makanan',     'pengeluaran',  '🍔'),
      ($1, 'Transport',   'pengeluaran',  '🚗'),
      ($1, 'Belanja',     'pengeluaran',  '🛒'),
      ($1, 'Hiburan',     'pengeluaran',  '🎮'),
      ($1, 'Tagihan',     'pengeluaran',  '📄'),
      ($1, 'Kesehatan',   'pengeluaran',  '🏥'),
      ($1, 'Pendidikan',  'pengeluaran',  '📚'),
      ($1, 'Lainnya',     'pengeluaran',  '📦');
  `, [userId]);
}

// Seed default dompet for a new user
async function seedDompetForUser(client, userId) {
  await client.query(`
    INSERT INTO dompet (user_id, nama, saldo_awal, ikon, warna) 
    VALUES ($1, 'Dompet Utama', 0, '👛', '#4361EE');
  `, [userId]);
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const { nama, email, password } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if email already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email sudah terdaftar.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await client.query(
      'INSERT INTO users (nama, email, password) VALUES ($1, $2, $3) RETURNING id, nama, email, created_at',
      [nama, email, hashedPassword]
    );
    const user = result.rows[0];

    // Seed default data for new user
    await seedKategoriForUser(client, user.id);
    await seedDompetForUser(client, user.id);

    await client.query('COMMIT');

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registrasi berhasil!',
      user: { id: user.id, nama: user.nama, email: user.email },
      token,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal registrasi: ' + err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login berhasil!',
      user: { id: user.id, nama: user.nama, email: user.email },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Gagal login: ' + err.message });
  }
});

/**
 * GET /api/auth/me — Get current user info
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nama, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/profile — Update profile (nama, email, optional password)
 */
router.put('/profile', authMiddleware, async (req, res) => {
  const { nama, email, password, passwordBaru } = req.body;

  if (!nama || !email) {
    return res.status(400).json({ error: 'Nama dan email wajib diisi.' });
  }

  try {
    // Check if email is taken by another user
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    if (emailCheck.rowCount > 0) {
      return res.status(409).json({ error: 'Email sudah digunakan user lain.' });
    }

    // If changing password, verify old password first
    if (passwordBaru) {
      if (!password) {
        return res.status(400).json({ error: 'Password lama wajib diisi untuk mengganti password.' });
      }
      if (passwordBaru.length < 6) {
        return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      }
      const userRow = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
      const isMatch = await bcrypt.compare(password, userRow.rows[0].password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Password lama salah.' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(passwordBaru, salt);
      await pool.query(
        'UPDATE users SET nama = $1, email = $2, password = $3 WHERE id = $4',
        [nama, email, hashed, req.user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET nama = $1, email = $2 WHERE id = $3',
        [nama, email, req.user.id]
      );
    }

    // Return updated user + new token
    const updated = await pool.query(
      'SELECT id, nama, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = updated.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Profil berhasil diperbarui!',
      user: { id: user.id, nama: user.nama, email: user.email },
      token,
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil: ' + err.message });
  }
});

module.exports = router;
