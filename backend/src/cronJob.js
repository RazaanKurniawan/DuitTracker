const cron = require('node-cron');
const pool = require('./db');

// Function to calculate next date based on frequency
function calculateNextDate(currentNextDate, frekuensi) {
  const nextDate = new Date(currentNextDate);
  
  if (frekuensi === 'harian') {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (frekuensi === 'mingguan') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frekuensi === 'bulanan') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (frekuensi === 'tahunan') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  
  return nextDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

// Function to process recurring transactions
async function processRecurringTransactions() {
  console.log(`[CRON] Memulai pengecekan transaksi berulang pada ${new Date().toISOString()}`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find all active recurring transactions where the next execution date is today or earlier
    const findQuery = `
      SELECT * FROM transaksi_berulang 
      WHERE is_active = true 
      AND tanggal_berikutnya <= CURRENT_DATE
    `;
    const { rows: pendingTransactions } = await client.query(findQuery);
    
    if (pendingTransactions.length === 0) {
      console.log('[CRON] Tidak ada transaksi berulang yang perlu diproses hari ini.');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`[CRON] Menemukan ${pendingTransactions.length} transaksi berulang yang perlu diproses.`);
    
    for (const trx of pendingTransactions) {
      try {
        // 1. Insert into transaksi
        const insertQuery = `
          INSERT INTO transaksi (user_id, dompet_id, kategori_id, tipe, jumlah, keterangan, tanggal)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const autoKeterangan = `[AUTO] ${trx.keterangan || 'Tagihan Rutin'}`;
        await client.query(insertQuery, [
          trx.user_id,
          trx.dompet_id,
          trx.kategori_id,
          trx.tipe,
          trx.jumlah,
          autoKeterangan,
          trx.tanggal_berikutnya // Use the scheduled date, not necessarily today if we missed it
        ]);
        
        // 2. Update tanggal_berikutnya
        const nextDateStr = calculateNextDate(trx.tanggal_berikutnya, trx.frekuensi);
        const updateQuery = `
          UPDATE transaksi_berulang 
          SET tanggal_berikutnya = $1 
          WHERE id = $2
        `;
        await client.query(updateQuery, [nextDateStr, trx.id]);
        
        console.log(`[CRON] Berhasil memproses transaksi berulang ID ${trx.id} untuk dompet ${trx.dompet_id} -> Next: ${nextDateStr}`);
      } catch (err) {
        console.error(`[CRON EXCEPTION] Gagal memproses transaksi berulang ID ${trx.id}`, err);
        // Continue to the next transaction even if one fails
      }
    }
    
    await client.query('COMMIT');
    console.log('[CRON] Pengecekan transaksi berulang selesai.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CRON FATAL ERROR] Gagal menjalankan pengecekan keseluruhan', err);
  } finally {
    client.release();
  }
}

function initCronJobs() {
  // Jalankan setiap jam 00:01 WIB 
  // Untuk keperluan development/testing kita bisa ganti jadi '* * * * *' (setiap menit)
  // Tapi untuk production idealnya '1 0 * * *' (Jam 00:01 tiap hari)
  
  console.log('⏳ Cron job diinisialisasi untuk transaksi berulang...');
  const crontab = process.env.NODE_ENV === 'development' ? '* * * * *' : '1 0 * * *';
  
  cron.schedule(crontab, () => {
    processRecurringTransactions();
  });
  
  // Karena saat server nyala mungkin saja kelewatan (server mati pas jam 00:01),
  // jalankan juga sekali saat start up
  setTimeout(() => {
    processRecurringTransactions();
  }, 1000 * 5); // 5 detik setelah server nyala
}

module.exports = {
  initCronJobs,
  processRecurringTransactions // Diekspor untuk testing route / manual trigger
};
