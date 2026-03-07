const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tabel users (auth)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabel kategori
    await client.query(`
      CREATE TABLE IF NOT EXISTS kategori (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        nama VARCHAR(100) NOT NULL,
        tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
        ikon VARCHAR(10) DEFAULT '📁',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabel dompet
    await client.query(`
      CREATE TABLE IF NOT EXISTS dompet (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        nama VARCHAR(100) NOT NULL,
        saldo_awal NUMERIC(15, 2) DEFAULT 0,
        ikon VARCHAR(10) DEFAULT '👛',
        warna VARCHAR(20) DEFAULT '#4361EE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tambah Dompet Default jika belum ada
    const resDompet = await client.query('SELECT id FROM dompet ORDER BY id ASC LIMIT 1');
    let defaultDompetId;
    if (resDompet.rowCount === 0) {
      const insertDompet = await client.query(`
        INSERT INTO dompet (nama, saldo_awal, ikon, warna) 
        VALUES ('Dompet Utama', 0, '👛', '#4361EE') RETURNING id;
      `);
      defaultDompetId = insertDompet.rows[0].id;
      console.log('✅ Default Dompet "Dompet Utama" berhasil dibuat.');
    } else {
      defaultDompetId = resDompet.rows[0].id;
    }

    // Tabel transaksi
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaksi (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        dompet_id INTEGER REFERENCES dompet(id) ON DELETE RESTRICT,
        kategori_id INTEGER REFERENCES kategori(id) ON DELETE SET NULL,
        tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
        jumlah NUMERIC(15, 2) NOT NULL,
        keterangan TEXT,
        tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrasi kolom dompet_id untuk tabel transaksi (jika sudah dibuat sebelumnya tanpa dompet_id)
    // To avoid nested transaction errors in PG, we will just check if column exists first
    const checkCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='transaksi' and column_name='dompet_id'
    `);
    
    if (checkCol.rowCount === 0) {
      await client.query('ALTER TABLE transaksi ADD COLUMN dompet_id INTEGER REFERENCES dompet(id) ON DELETE RESTRICT;');
      console.log('✅ Kolom dompet_id ditambahkan ke tabel transaksi.');
      
      // Update semua transaksi lama ke dompet default
      await client.query('UPDATE transaksi SET dompet_id = $1 WHERE dompet_id IS NULL;', [defaultDompetId]);
      console.log('✅ Transaksi lama berhasil di-update ke Dompet Utama.');
      
      // Set NOT NULL
      await client.query('ALTER TABLE transaksi ALTER COLUMN dompet_id SET NOT NULL;');
      console.log('✅ Kolom dompet_id diset menjadi NOT NULL.');
    }

    // Tabel transaksi_berulang
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaksi_berulang (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        dompet_id INTEGER REFERENCES dompet(id) ON DELETE RESTRICT,
        kategori_id INTEGER REFERENCES kategori(id) ON DELETE SET NULL,
        tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
        jumlah NUMERIC(15, 2) NOT NULL,
        keterangan TEXT,
        frekuensi VARCHAR(20) NOT NULL CHECK (frekuensi IN ('harian', 'mingguan', 'bulanan', 'tahunan')),
        tanggal_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
        tanggal_berikutnya DATE NOT NULL DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // Tabel anggaran
    await client.query(`
      CREATE TABLE IF NOT EXISTS anggaran (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        kategori_id INTEGER NOT NULL REFERENCES kategori(id) ON DELETE CASCADE,
        bulan INTEGER NOT NULL,
        tahun INTEGER NOT NULL,
        batas_jumlah NUMERIC(15, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, kategori_id, bulan, tahun)
      );
    `);

    // ========== Migrasi user_id ke tabel yang sudah ada ==========
    const tablesToMigrate = ['kategori', 'dompet', 'transaksi', 'transaksi_berulang', 'anggaran'];
    for (const tbl of tablesToMigrate) {
      const checkUserCol = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name=$1 AND column_name='user_id'
      `, [tbl]);
      if (checkUserCol.rowCount === 0) {
        // Tambah kolom user_id nullable dulu
        await client.query(`ALTER TABLE ${tbl} ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        console.log(`✅ Kolom user_id ditambahkan ke tabel ${tbl}.`);
      }
    }

    // Drop old unique constraint on anggaran if exists, replace with new one
    try {
      await client.query(`ALTER TABLE anggaran DROP CONSTRAINT IF EXISTS anggaran_kategori_id_bulan_tahun_key;`);
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'anggaran_user_id_kategori_id_bulan_tahun_key'
          ) THEN
            ALTER TABLE anggaran ADD CONSTRAINT anggaran_user_id_kategori_id_bulan_tahun_key 
            UNIQUE(user_id, kategori_id, bulan, tahun);
          END IF;
        END $$;
      `);
    } catch (e) {
      // constraint might not exist, that's fine
    }

    // Seed kategori default (hanya jika belum ada)
    // Migrasi kolom mata_uang untuk dompet
    const checkMataUang = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='dompet' AND column_name='mata_uang'
    `);
    if (checkMataUang.rowCount === 0) {
      await client.query(`ALTER TABLE dompet ADD COLUMN mata_uang VARCHAR(10) DEFAULT 'IDR';`);
      console.log('✅ Kolom mata_uang ditambahkan ke tabel dompet.');
    }

    // Migrasi kolom foto untuk transaksi
    const checkFoto = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='transaksi' AND column_name='foto'
    `);
    if (checkFoto.rowCount === 0) {
      await client.query(`ALTER TABLE transaksi ADD COLUMN foto TEXT;`);
      console.log('✅ Kolom foto ditambahkan ke tabel transaksi.');
    }

    // Tabel tabungan (financial goals)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tabungan (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        nama VARCHAR(100) NOT NULL,
        target_jumlah NUMERIC(15, 2) NOT NULL,
        terkumpul NUMERIC(15, 2) DEFAULT 0,
        ikon VARCHAR(10) DEFAULT '🎯',
        warna VARCHAR(20) DEFAULT '#4361EE',
        target_tanggal DATE,
        catatan TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rowCount } = await client.query('SELECT 1 FROM kategori LIMIT 1');
    if (rowCount === 0) {
      await client.query(`
        INSERT INTO kategori (nama, tipe, ikon) VALUES
          ('Gaji',        'pemasukan',    '💰'),
          ('Freelance',   'pemasukan',    '💻'),
          ('Bonus',       'pemasukan',    '🎁'),
          ('Investasi',   'pemasukan',    '📈'),
          ('Lainnya',     'pemasukan',    '💵'),
          ('Makanan',     'pengeluaran',  '🍔'),
          ('Transport',   'pengeluaran',  '🚗'),
          ('Belanja',     'pengeluaran',  '🛒'),
          ('Hiburan',     'pengeluaran',  '🎮'),
          ('Tagihan',     'pengeluaran',  '📄'),
          ('Kesehatan',   'pengeluaran',  '🏥'),
          ('Pendidikan',  'pengeluaran',  '📚'),
          ('Lainnya',     'pengeluaran',  '📦');
      `);
      console.log('✅ Seed data kategori berhasil ditambahkan');
    }

    await client.query('COMMIT');
    console.log('✅ Migration berhasil!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration gagal:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
