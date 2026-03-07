<template>
  <div class="m-page">
    <!-- Month Filter -->
    <MobileMonthPicker v-model:month="selectedMonth" v-model:year="selectedYear" @change="loadRingkasan" />

    <!-- Ringkasan -->
    <div v-if="loading" class="m-spinner"></div>

    <template v-else>
      <div class="m-stats-row">
        <div class="m-stat-card">
          <div class="m-stat-label">📈 Pemasukan</div>
          <div class="m-stat-value" style="color: var(--accent-green); font-size: 16px;">
            {{ formatRp(ringkasan.total_pemasukan) }}
          </div>
        </div>
        <div class="m-stat-card">
          <div class="m-stat-label">📉 Pengeluaran</div>
          <div class="m-stat-value" style="color: var(--accent-red); font-size: 16px;">
            {{ formatRp(ringkasan.total_pengeluaran) }}
          </div>
        </div>
      </div>
      <div class="m-card" style="text-align: center;">
        <div class="m-stat-label">💰 Saldo</div>
        <div class="m-stat-value">{{ formatRp(ringkasan.saldo) }}</div>
      </div>
    </template>

    <!-- Export Buttons -->
    <h3 class="m-section-title">📤 Ekspor Data</h3>
    <button class="m-btn m-btn-primary m-btn-block" @click="downloadExcel" :disabled="exporting" style="margin-bottom: 10px;">
      {{ exporting ? 'Mengunduh...' : '📊 Download Excel' }}
    </button>
    <button class="m-btn m-btn-secondary m-btn-block" @click="downloadPdf" :disabled="exporting">
      {{ exporting ? 'Mengunduh...' : '📄 Download PDF' }}
    </button>

    <div v-if="toast" class="m-toast" :class="toastType">{{ toast }}</div>
  </div>
</template>

<script>
import api from '../../services/api';
import MobileMonthPicker from '../components/MobileMonthPicker.vue';

export default {
  name: 'MobileLaporan',
  components: { MobileMonthPicker },
  data() {
    const now = new Date();
    return {
      loading: true,
      selectedMonth: now.getMonth() + 1,
      selectedYear: now.getFullYear(),
      ringkasan: {},
      exporting: false,
      toast: '',
      toastType: 'success',
    };
  },
  computed: {
    queryParams() {
      return { bulan: this.selectedMonth, tahun: this.selectedYear };
    },
  },
  methods: {
    async loadRingkasan() {
      this.loading = true;
      try {
        this.ringkasan = (await api.get('/transaksi/ringkasan', { params: this.queryParams })).data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    async downloadExcel() {
      this.exporting = true;
      try {
        const res = await api.get('/laporan/excel', { params: this.queryParams, responseType: 'blob' });
        this.triggerDownload(res.data, `Laporan_${this.selectedMonth}-${this.selectedYear}.xlsx`);
        this.showToast('Excel berhasil diunduh!');
      } catch {
        this.showToast('Gagal download Excel', 'error');
      } finally {
        this.exporting = false;
      }
    },
    async downloadPdf() {
      this.exporting = true;
      try {
        const res = await api.get('/laporan/pdf', { params: this.queryParams, responseType: 'blob' });
        this.triggerDownload(res.data, `Laporan_${this.selectedMonth}-${this.selectedYear}.pdf`);
        this.showToast('PDF berhasil diunduh!');
      } catch {
        this.showToast('Gagal download PDF', 'error');
      } finally {
        this.exporting = false;
      }
    },
    triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    formatRp(v) {
      return 'Rp ' + (Number(v) || 0).toLocaleString('id-ID');
    },
    showToast(msg, type = 'success') {
      this.toast = msg;
      this.toastType = type;
      setTimeout(() => { this.toast = ''; }, 3000);
    },
  },
  mounted() {
    this.loadRingkasan();
  },
};
</script>
