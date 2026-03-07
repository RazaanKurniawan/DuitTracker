<template>
  <div class="m-page">
    <!-- Month filter -->
    <MobileMonthPicker v-model:month="bulan" v-model:year="tahun" @change="fetchData" />

    <div v-if="loading" class="m-spinner"></div>

    <template v-else>
      <!-- Stats -->
      <div class="m-stats-row">
        <div class="m-stat-card">
          <div class="m-stat-label">📈 Pemasukan</div>
          <div class="m-stat-value" style="color: var(--accent-green);">{{ formatRp(ringkasan.total_pemasukan) }}</div>
        </div>
        <div class="m-stat-card">
          <div class="m-stat-label">📉 Pengeluaran</div>
          <div class="m-stat-value" style="color: var(--accent-red);">{{ formatRp(ringkasan.total_pengeluaran) }}</div>
        </div>
      </div>
      <div class="m-card" style="text-align: center;">
        <div class="m-stat-label">💰 Saldo Total</div>
        <div class="m-stat-value" style="font-size: 24px;">{{ formatRp(ringkasan.saldo) }}</div>
      </div>

      <!-- Wallets -->
      <h3 class="m-section-title">💳 Dompet</h3>
      <div class="m-wallet-scroll">
        <div
          v-for="d in dompetList"
          :key="d.id"
          class="m-wallet-chip"
          :style="{ borderLeftColor: d.warna || 'var(--accent-blue)' }"
        >
          <span class="m-wc-name">{{ d.ikon || '👛' }} {{ d.nama }}</span>
          <span class="m-wc-bal">{{ formatRp(d.saldo_saat_ini ?? d.saldo_awal) }}</span>
        </div>
      </div>

      <!-- Pie Chart -->
      <div v-if="pengeluaranBreakdown.length" class="m-card">
        <h3 class="m-section-title" style="margin-top: 0;">🥧 Pengeluaran per Kategori</h3>
        <canvas ref="pieChart" style="max-height: 200px;"></canvas>
      </div>

      <!-- Upcoming Bills -->
      <div v-if="upcomingBills.length">
        <h3 class="m-section-title">🔔 Tagihan Mendatang</h3>
        <div v-for="b in upcomingBills" :key="b.id" class="m-txn-item" style="cursor: default;">
          <div class="m-txn-icon">{{ b.kategori_ikon || '📄' }}</div>
          <div class="m-txn-info">
            <div class="m-txn-desc">{{ b.keterangan || b.kategori_nama }}</div>
            <div class="m-txn-meta">{{ b.dompet_nama }} · {{ formatDate(b.tanggal_berikutnya) }}</div>
          </div>
          <div class="m-txn-amount pengeluaran">{{ formatRp(b.jumlah) }}</div>
        </div>
      </div>

      <!-- Breakdown bars -->
      <div v-if="pengeluaranBreakdown.length">
        <h3 class="m-section-title">📉 Detail Pengeluaran</h3>
        <div v-for="item in pengeluaranBreakdown" :key="item.kategori" class="m-breakdown-item">
          <div class="m-bd-top">
            <span>{{ item.ikon || '📦' }} {{ item.kategori || 'Lainnya' }}</span>
            <span style="color: var(--accent-red);">{{ formatRp(item.total) }}</span>
          </div>
          <div class="m-progress">
            <div class="m-progress-bar" :style="{ width: barWidth(item.total) + '%', background: 'linear-gradient(90deg, #ff4757, #ff6b7a)' }"></div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="toast" class="m-toast" :class="toastType">{{ toast }}</div>
  </div>
</template>

<script>
import api from '../../services/api';
import MobileMonthPicker from '../components/MobileMonthPicker.vue';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const pieColors = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff6b81', '#70a1ff', '#7bed9f', '#eccc68'];

export default {
  name: 'MobileDashboard',
  components: { MobileMonthPicker },
  data() {
    const now = new Date();
    return {
      loading: true,
      bulan: now.getMonth() + 1,
      tahun: now.getFullYear(),
      ringkasan: { total_pemasukan: 0, total_pengeluaran: 0, saldo: 0, breakdown: [] },
      dompetList: [],
      upcomingBills: [],
      pieInstance: null,
      toast: '',
      toastType: 'success',
    };
  },
  computed: {
    pengeluaranBreakdown() {
      return this.ringkasan.breakdown?.filter(b => b.tipe === 'pengeluaran') || [];
    },
    maxPengeluaran() {
      return Math.max(...this.pengeluaranBreakdown.map(b => b.total), 1);
    },
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const [ring, domp, berulang] = await Promise.all([
          api.get('/transaksi/ringkasan', { params: { bulan: this.bulan, tahun: this.tahun } }),
          api.get('/dompet'),
          api.get('/transaksi-berulang'),
        ]);
        this.ringkasan = ring.data;
        this.dompetList = domp.data;
        this.ringkasan.saldo = this.dompetList.reduce((s, d) => s + parseFloat(d.saldo_saat_ini || d.saldo_awal || 0), 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in7 = new Date(now);
        in7.setDate(in7.getDate() + 7);
        this.upcomingBills = berulang.data
          .filter(b => {
            if (!b.is_active) return false;
            const next = new Date(b.tanggal_berikutnya);
            next.setHours(0, 0, 0, 0);
            return next >= now && next <= in7;
          })
          .sort((a, b) => new Date(a.tanggal_berikutnya) - new Date(b.tanggal_berikutnya));
      } catch {
        this.showToast('Gagal memuat data', 'error');
      } finally {
        this.loading = false;
        this.$nextTick(() => this.renderPie());
      }
    },
    renderPie() {
      if (this.pieInstance) this.pieInstance.destroy();
      const canvas = this.$refs.pieChart;
      if (!canvas || !this.pengeluaranBreakdown.length) return;
      this.pieInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: this.pengeluaranBreakdown.map(b => `${b.ikon || '📦'} ${b.kategori}`),
          datasets: [{
            data: this.pengeluaranBreakdown.map(b => b.total),
            backgroundColor: pieColors,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 11 }, padding: 8 } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: Rp ${Number(ctx.parsed).toLocaleString('id-ID')}`,
              },
            },
          },
        },
      });
    },
    barWidth(val) {
      return Math.round((val / this.maxPengeluaran) * 100);
    },
    formatRp(v) {
      return 'Rp ' + (Number(v) || 0).toLocaleString('id-ID');
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    },
    showToast(msg, type = 'success') {
      this.toast = msg;
      this.toastType = type;
      setTimeout(() => { this.toast = ''; }, 3000);
    },
  },
  mounted() {
    this.fetchData();
  },
  beforeUnmount() {
    if (this.pieInstance) this.pieInstance.destroy();
  },
};
</script>

<style scoped>
.m-wallet-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}
.m-wallet-chip {
  flex-shrink: 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-left: 3px solid;
  min-width: 140px;
}
.m-wc-name {
  font-size: 13px;
  color: var(--text-secondary);
  display: block;
}
.m-wc-bal {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
  margin-top: 4px;
}
.m-breakdown-item {
  margin-bottom: 12px;
}
.m-bd-top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}
</style>
