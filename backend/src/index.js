const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const swaggerSpec = require('./swagger');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const kategoriRoutes = require('./routes/kategoriRoutes');
const transaksiRoutes = require('./routes/transaksiRoutes');
const dompetRoutes = require('./routes/dompetRoutes');
const berulangRoutes = require('./routes/berulangRoutes');
const anggaranRoutes = require('./routes/anggaranRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const tabunganRoutes = require('./routes/tabunganRoutes');
const { initCronJobs } = require('./cronJob');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'none'} | IP: ${req.ip}`);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'DuitTracker API Docs',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kategori', authMiddleware, kategoriRoutes);
app.use('/api/transaksi', authMiddleware, transaksiRoutes);
app.use('/api/dompet', authMiddleware, dompetRoutes);
app.use('/api/transaksi-berulang', authMiddleware, berulangRoutes);
app.use('/api/anggaran', authMiddleware, anggaranRoutes);
app.use('/api/laporan', authMiddleware, laporanRoutes);
app.use('/api/tabungan', authMiddleware, tabunganRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server (Express 5 returns a Promise from app.listen)
async function start() {
  try {
    await app.listen(PORT);
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    
    // Inisialisasi schedule recurring transactions
    initCronJobs();
  } catch (err) {
    console.error('❌ Gagal start server:', err);
    process.exit(1);
  }
}

start();
