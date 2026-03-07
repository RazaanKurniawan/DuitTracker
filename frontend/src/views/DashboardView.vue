<template>
  <div class="dashboard-page fade-in">
    <div class="page-header">
      <h2>Dashboard</h2>
      <p>Ringkasan keuangan bulan {{ namaBulan }}</p>
    </div>

    <!-- Filter Bulan/Tahun — Month Picker -->
    <div class="filters-bar">
      <VueDatePicker
        v-model="selectedMonth"
        month-picker
        auto-apply
        dark
        :clearable="false"
        placeholder="Pilih bulan"
        @update:model-value="onMonthChange"
      />
    </div>

    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card pemasukan">
          <div class="stat-icon">📈</div>
          <div class="stat-label">Total Pemasukan</div>
          <div class="stat-value">{{ formatRupiah(ringkasan.total_pemasukan) }}</div>
        </div>
        <div class="stat-card pengeluaran">
          <div class="stat-icon">📉</div>
          <div class="stat-label">Total Pengeluaran</div>
          <div class="stat-value">{{ formatRupiah(ringkasan.total_pengeluaran) }}</div>
        </div>
        <div class="stat-card saldo">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Saldo</div>
          <div class="stat-value">{{ formatRupiah(ringkasan.saldo) }}</div>
        </div>
      </div>

      <!-- Saldo Per Dompet -->
      <h3 style="margin-top: 32px; margin-bottom: 16px;">💳 Saldo Dompet / Rekening</h3>
      <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); margin-bottom: 32px;">
        <div v-for="d in dompetList" :key="d.id" class="stat-card" style="border-top: 4px solid; padding: 20px;" :style="{ borderTopColor: d.warna || 'var(--accent-blue)' }">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div class="stat-icon" :style="{ background: d.warna ? d.warna + '20' : 'rgba(67, 97, 238, 0.1)', color: d.warna || 'var(--accent-blue)' }">
              {{ d.ikon || '👛' }}
            </div>
            <div class="stat-info">
              <div class="stat-label" style="font-size: 14px; font-weight: 500;">{{ d.nama }}</div>
              <div class="stat-value" style="font-size: 18px; margin-top: 4px;">
                {{ formatRupiah(d.saldo_saat_ini !== undefined ? d.saldo_saat_ini : d.saldo_awal) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="dashboard-grid" style="margin-bottom: 32px;">
        <div class="chart-card">
          <h3>🥧 Pengeluaran per Kategori</h3>
          <div v-if="pengeluaranBreakdown.length === 0" class="empty-state" style="padding: 30px;">
            <p>Belum ada data pengeluaran</p>
          </div>
          <div v-else class="chart-wrapper">
            <canvas ref="pieChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3>📈 Tren 6 Bulan Terakhir</h3>
          <div v-if="trenData.length === 0" class="empty-state" style="padding: 30px;">
            <p>Belum ada data tren</p>
          </div>
          <div v-else class="chart-wrapper">
            <canvas ref="lineChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Notifikasi Tagihan Jatuh Tempo -->
      <div v-if="upcomingBills.length > 0" class="bills-alert" style="margin-bottom: 32px;">
        <h3>🔔 Tagihan Mendatang (7 Hari ke Depan)</h3>
        <div class="bills-list">
          <div v-for="bill in upcomingBills" :key="bill.id" class="bill-item">
            <div class="bill-icon">{{ bill.kategori_ikon || '📄' }}</div>
            <div class="bill-info">
              <div class="bill-name">{{ bill.keterangan || bill.kategori_nama }}</div>
              <div class="bill-meta">
                {{ bill.dompet_ikon }} {{ bill.dompet_nama }} · {{ bill.frekuensi }}
              </div>
            </div>
            <div class="bill-right">
              <div class="bill-amount" :style="{ color: bill.tipe === 'pemasukan' ? 'var(--accent-green)' : 'var(--accent-red)' }">
                {{ bill.tipe === 'pemasukan' ? '+' : '-' }} {{ formatRupiah(bill.jumlah) }}
              </div>
              <div class="bill-date" :class="{ 'bill-today': isToday(bill.tanggal_berikutnya) }">
                {{ isToday(bill.tanggal_berikutnya) ? '📍 Hari ini' : formatTanggalShort(bill.tanggal_berikutnya) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Breakdown -->
      <div class="dashboard-grid">
        <div class="breakdown-section">
          <h3>📉 Pengeluaran per Kategori</h3>
          <div v-if="pengeluaranBreakdown.length === 0" class="empty-state" style="padding: 30px;">
            <p>Belum ada data pengeluaran</p>
          </div>
          <div class="breakdown-list" v-else>
            <div class="breakdown-item" v-for="item in pengeluaranBreakdown" :key="item.kategori">
              <div class="bi-icon">{{ item.ikon || '📦' }}</div>
              <div class="bi-info">
                <div class="bi-name">{{ item.kategori || 'Tanpa Kategori' }}</div>
                <div class="bi-bar-container">
                  <div class="bi-bar" :style="{ width: barWidth(item.total, maxPengeluaran) + '%', background: 'linear-gradient(90deg, #ff4757, #ff6b7a)' }"></div>
                </div>
              </div>
              <div class="bi-amount" style="color: var(--accent-red);">{{ formatRupiah(item.total) }}</div>
            </div>
          </div>
        </div>
        <div class="breakdown-section">
          <h3>📈 Pemasukan per Kategori</h3>
          <div v-if="pemasukanBreakdown.length === 0" class="empty-state" style="padding: 30px;">
            <p>Belum ada data pemasukan</p>
          </div>
          <div class="breakdown-list" v-else>
            <div class="breakdown-item" v-for="item in pemasukanBreakdown" :key="item.kategori">
              <div class="bi-icon">{{ item.ikon || '💵' }}</div>
              <div class="bi-info">
                <div class="bi-name">{{ item.kategori || 'Tanpa Kategori' }}</div>
                <div class="bi-bar-container">
                  <div class="bi-bar" :style="{ width: barWidth(item.total, maxPemasukan) + '%', background: 'linear-gradient(90deg, #00c897, #00e6a8)' }"></div>
                </div>
              </div>
              <div class="bi-amount" style="color: var(--accent-green);">{{ formatRupiah(item.total) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import api from '../services/api';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { Chart, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';

Chart.register(ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const bulanNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pieColors = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff6b81', '#70a1ff', '#7bed9f', '#eccc68', '#cf6a87', '#574b90'];

export default {
  name: 'DashboardView',
  components: { VueDatePicker },
  data() {
    const now = new Date();
    return {
      loading: true,
      selectedMonth: { month: now.getMonth(), year: now.getFullYear() },
      ringkasan: { total_pemasukan: 0, total_pengeluaran: 0, saldo: 0, breakdown: [] },
      dompetList: [],
      trenData: [],
      upcomingBills: [],
      pieChartInstance: null,
      lineChartInstance: null,
    };
  },
  computed: {
    bulan() { return this.selectedMonth.month + 1; },
    tahun() { return this.selectedMonth.year; },
    namaBulan() {
      return bulanNames[this.selectedMonth.month] + ' ' + this.tahun;
    },
    pengeluaranBreakdown() {
      return this.ringkasan.breakdown?.filter(b => b.tipe === 'pengeluaran') || [];
    },
    pemasukanBreakdown() {
      return this.ringkasan.breakdown?.filter(b => b.tipe === 'pemasukan') || [];
    },
    maxPengeluaran() {
      return Math.max(...this.pengeluaranBreakdown.map(b => b.total), 1);
    },
    maxPemasukan() {
      return Math.max(...this.pemasukanBreakdown.map(b => b.total), 1);
    },
  },
  methods: {
    onMonthChange() {
      this.fetchData();
    },
    async fetchData() {
      this.loading = true;
      try {
        const [ringkasanRes, dompetRes, trenRes, berulangRes] = await Promise.all([
          api.get('/transaksi/ringkasan', { params: { bulan: this.bulan, tahun: this.tahun } }),
          api.get('/dompet'),
          api.get('/transaksi/tren'),
          api.get('/transaksi-berulang'),
        ]);
        this.ringkasan = ringkasanRes.data;
        this.dompetList = dompetRes.data;
        // Saldo = total semua saldo dompet (lebih akurat karena memperhitungkan transfer & tabungan)
        this.ringkasan.saldo = this.dompetList.reduce((sum, d) => sum + parseFloat(d.saldo_saat_ini || d.saldo_awal || 0), 0);
        this.trenData = trenRes.data;

        // Filter upcoming bills within 7 days
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);
        this.upcomingBills = berulangRes.data
          .filter(b => {
            if (!b.is_active) return false;
            const next = new Date(b.tanggal_berikutnya);
            next.setHours(0, 0, 0, 0);
            return next >= now && next <= in7Days;
          })
          .sort((a, b) => new Date(a.tanggal_berikutnya) - new Date(b.tanggal_berikutnya));
      } catch (err) {
        console.error('Error fetching data dashboard:', err);
      } finally {
        this.loading = false;
        this.$nextTick(() => {
          this.renderPieChart();
          this.renderLineChart();
        });
      }
    },
    renderPieChart() {
      if (this.pieChartInstance) this.pieChartInstance.destroy();
      const canvas = this.$refs.pieChart;
      if (!canvas || this.pengeluaranBreakdown.length === 0) return;
      this.pieChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: this.pengeluaranBreakdown.map(b => `${b.ikon || '📦'} ${b.kategori || 'Lainnya'}`),
          datasets: [{
            data: this.pengeluaranBreakdown.map(b => b.total),
            backgroundColor: pieColors.slice(0, this.pengeluaranBreakdown.length),
            borderWidth: 0,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#e0e0ff', padding: 12, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: Rp ${Number(ctx.parsed).toLocaleString('id-ID')}`,
              },
            },
          },
        },
      });
    },
    renderLineChart() {
      if (this.lineChartInstance) this.lineChartInstance.destroy();
      const canvas = this.$refs.lineChart;
      if (!canvas || this.trenData.length === 0) return;
      const labels = this.trenData.map(t => bulanNames[t.bulan - 1]?.substring(0, 3) + ' ' + t.tahun);
      this.lineChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pemasukan',
              data: this.trenData.map(t => t.total_pemasukan),
              borderColor: '#00c897',
              backgroundColor: 'rgba(0, 200, 151, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
            {
              label: 'Pengeluaran',
              data: this.trenData.map(t => t.total_pengeluaran),
              borderColor: '#ff4757',
              backgroundColor: 'rgba(255, 71, 87, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: {
              ticks: {
                color: '#8888aa',
                callback: (v) => 'Rp ' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'jt' : (v / 1000).toFixed(0) + 'rb'),
              },
              grid: { color: 'rgba(255,255,255,0.05)' },
            },
          },
          plugins: {
            legend: { labels: { color: '#e0e0ff', padding: 12 } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: Rp ${Number(ctx.parsed.y).toLocaleString('id-ID')}`,
              },
            },
          },
        },
      });
    },
    formatRupiah(val) {
      const num = Number(val) || 0;
      return 'Rp ' + num.toLocaleString('id-ID');
    },
    barWidth(val, max) {
      return Math.round((val / max) * 100);
    },
    isToday(dateStr) {
      const d = new Date(dateStr);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    },
    formatTanggalShort(dateStr) {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    },
  },
  mounted() {
    this.fetchData();
  },
  beforeUnmount() {
    if (this.pieChartInstance) this.pieChartInstance.destroy();
    if (this.lineChartInstance) this.lineChartInstance.destroy();
  },
};
</script>

<style scoped>
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.chart-card h3 {
  margin-bottom: 16px;
  font-size: 16px;
}

.chart-wrapper {
  position: relative;
  height: 300px;
}

.bills-alert {
  background: var(--bg-card);
  border: 1px solid var(--accent-orange);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.bills-alert h3 {
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--accent-orange);
}

.bills-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}

.bill-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.bill-info {
  flex: 1;
  min-width: 0;
}

.bill-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.bill-right {
  text-align: right;
  flex-shrink: 0;
}

.bill-amount {
  font-weight: 700;
  font-size: 14px;
}

.bill-date {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.bill-today {
  color: var(--accent-orange);
  font-weight: 600;
}
</style>
