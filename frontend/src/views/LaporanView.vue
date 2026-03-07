<template>
  <div class="laporan-page fade-in">
    <div class="page-header">
      <h2>📑 Export Laporan</h2>
      <p>Download ringkasan keuanganmu dalam format PDF atau Excel</p>
    </div>

    <!-- Filter Section -->
    <div class="filters-container form-card" style="margin-bottom: 24px; max-width: 100%; padding: 24px;">
      <div class="form-row" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">

        <!-- Month Picker -->
        <div class="form-group" style="margin-bottom: 0;">
          <label>Bulan & Tahun</label>
          <VueDatePicker
            v-model="selectedMonth"
            month-picker
            auto-apply
            dark
            :clearable="true"
            placeholder="Semua Waktu"
          />
        </div>

        <!-- Tipe -->
        <div class="form-group" style="margin-bottom: 0;">
          <label>Tipe Data</label>
          <CustomSelect 
            v-model="filters.tipe" 
            :options="[
              { label: 'Semua Tipe', value: '' },
              { label: 'Pemasukan', value: 'pemasukan' },
              { label: 'Pengeluaran', value: 'pengeluaran' }
            ]"
            placeholder="Pilih Tipe"
            @change="onTipeChange"
          />
        </div>

        <!-- Dompet -->
        <div class="form-group" style="margin-bottom: 0;">
          <label>Sumber Dana</label>
          <CustomSelect 
            v-model="filters.dompet_id" 
            :options="[{ label: 'Semua Dompet', value: '' }, ...dompetList.map(d => ({ label: `${d.ikon} ${d.nama}`, value: d.id }))]"
            placeholder="Semua Dompet"
          />
        </div>

        <!-- Kategori -->
        <div class="form-group" style="margin-bottom: 0;">
          <label>Kategori</label>
          <CustomDropdownTags 
            v-model="filters.kategori_idArray" 
            :options="filteredKategoriList.map(k => ({ label: `${k.ikon} ${k.nama}`, value: k.id }))"
            placeholder="Pilih Kategori"
          />
        </div>

        <!-- Search -->
        <div class="form-group" style="margin-bottom: 0;">
          <label>Pencarian Keterangan</label>
          <CustomTagInput 
            v-model="filters.qArray" 
            placeholder="Ketik tag lalu Enter..." 
          />
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button class="btn btn-primary" @click="previewData">🔍 Preview Data</button>
        <button class="btn btn-secondary" @click="resetFilter">🔄 Reset</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div v-if="loaded" class="stats-grid" style="margin-bottom: 24px;">
      <div class="stat-card pemasukan">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Total Pemasukan</div>
        <div class="stat-value">{{ formatRupiah(summary.total_pemasukan) }}</div>
      </div>
      <div class="stat-card pengeluaran">
        <div class="stat-icon">📉</div>
        <div class="stat-label">Total Pengeluaran</div>
        <div class="stat-value">{{ formatRupiah(summary.total_pengeluaran) }}</div>
      </div>
      <div class="stat-card saldo">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Saldo</div>
        <div class="stat-value">{{ formatRupiah(summary.saldo) }}</div>
      </div>
    </div>

    <!-- Export Buttons -->
    <div v-if="loaded" class="export-actions" style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      <button class="btn btn-export excel" @click="downloadExcel" :disabled="exporting">
        <span class="export-icon">📊</span>
        <div>
          <div class="export-label">Download Excel</div>
          <div class="export-sub">Format .xlsx — bisa diedit di Excel / Google Sheets</div>
        </div>
      </button>
      <button class="btn btn-export pdf" @click="downloadPdf" :disabled="exporting">
        <span class="export-icon">📄</span>
        <div>
          <div class="export-label">Download PDF</div>
          <div class="export-sub">Format .pdf — cocok untuk cetak atau arsip</div>
        </div>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>

    <!-- Preview Table -->
    <div v-if="loaded && !loading && transaksi.length > 0" class="data-table-container">
      <div class="table-header">
        <h3>Preview: {{ transaksi.length }} Transaksi</h3>
        <span style="color: var(--text-secondary); font-size: 13px;">{{ periodLabel }}</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Dompet</th>
            <th>Keterangan</th>
            <th>Tipe</th>
            <th>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, idx) in transaksi" :key="idx">
            <td>{{ idx + 1 }}</td>
            <td>{{ formatTanggal(t.tanggal) }}</td>
            <td>{{ t.kategori_ikon || '📁' }} {{ t.kategori_nama || '-' }}</td>
            <td>{{ t.dompet_ikon || '👛' }} {{ t.dompet_nama || '-' }}</td>
            <td>{{ t.keterangan || '-' }}</td>
            <td>
              <span class="badge" :class="t.tipe">
                {{ t.tipe === 'pemasukan' ? '📈' : '📉' }} {{ t.tipe }}
              </span>
            </td>
            <td :style="{ color: t.tipe === 'pemasukan' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }">
              {{ t.tipe === 'pemasukan' ? '+' : '-' }} {{ formatRupiah(t.jumlah) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loaded && !loading && transaksi.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>Tidak ada data</h3>
      <p>Tidak ada transaksi ditemukan untuk filter yang dipilih.</p>
    </div>

    <!-- Import Section -->
    <div class="import-section form-card" style="margin-top: 40px; padding: 24px;">
      <h3 style="margin-bottom: 8px;">📥 Import Transaksi</h3>
      <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
        Upload file CSV atau Excel (.xlsx) dengan kolom: <strong>tipe, jumlah, keterangan, tanggal, kategori, dompet</strong>
      </p>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <label class="btn btn-secondary" style="cursor: pointer;">
          📂 Pilih File
          <input type="file" accept=".csv,.xlsx,.xls" @change="onFileSelected" style="display: none;" ref="fileInput" />
        </label>
        <span v-if="importFile" style="font-size: 13px; color: var(--text-secondary);">{{ importFile.name }}</span>
        <button v-if="importFile" class="btn btn-primary" @click="doImport" :disabled="importing" style="background: var(--accent-green);">
          {{ importing ? '⏳ Mengimport...' : '📥 Import' }}
        </button>
      </div>
      <div v-if="importResult" class="import-result" style="margin-top: 16px; padding: 14px; background: var(--bg-secondary); border-radius: var(--radius-md); font-size: 13px;">
        <div style="font-weight: 600; margin-bottom: 6px;">Hasil Import:</div>
        <div>✅ Berhasil: {{ importResult.imported }} transaksi</div>
        <div v-if="importResult.skipped > 0">⚠️ Dilewati: {{ importResult.skipped }} baris</div>
        <div v-if="importResult.errors && importResult.errors.length > 0" style="margin-top: 8px; color: var(--accent-orange);">
          <div v-for="(e, i) in importResult.errors" :key="i">{{ e }}</div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.type === 'success' ? '✅' : '❌' }} {{ toast.message }}
    </div>
  </div>
</template>

<script>
import api from '../services/api';
import CustomSelect from '../components/CustomSelect.vue';
import CustomTagInput from '../components/CustomTagInput.vue';
import CustomDropdownTags from '../components/CustomDropdownTags.vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

const bulanNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default {
  name: 'LaporanView',
  components: { VueDatePicker, CustomSelect, CustomTagInput, CustomDropdownTags },
  data() {
    const now = new Date();
    return {
      loading: false,
      loaded: false,
      exporting: false,
      kategoriList: [],
      dompetList: [],
      transaksi: [],
      summary: { total_pemasukan: 0, total_pengeluaran: 0, saldo: 0 },
      selectedMonth: { month: now.getMonth(), year: now.getFullYear() },
      filters: {
        qArray: [],
        tipe: '',
        kategori_idArray: [],
        dompet_id: '',
      },
      toast: { show: false, message: '', type: 'success' },
      importFile: null,
      importing: false,
      importResult: null,
    };
  },
  computed: {
    filteredKategoriList() {
      if (!this.filters.tipe) return this.kategoriList;
      return this.kategoriList.filter(k => k.tipe === this.filters.tipe);
    },
    periodLabel() {
      if (!this.selectedMonth) return 'Semua Periode';
      return bulanNames[this.selectedMonth.month] + ' ' + this.selectedMonth.year;
    },
    queryParams() {
      const params = {};
      if (this.selectedMonth) {
        params.bulan = this.selectedMonth.month + 1;
        params.tahun = this.selectedMonth.year;
      }
      if (this.filters.tipe) params.tipe = this.filters.tipe;
      if (this.filters.dompet_id) params.dompet_id = this.filters.dompet_id;
      if (this.filters.kategori_idArray.length > 0) {
        params.kategori_id = this.filters.kategori_idArray.join(',');
      }
      if (this.filters.qArray.length > 0) {
        params.q = this.filters.qArray.join(',');
      }
      return params;
    },
  },
  methods: {
    async loadMeta() {
      try {
        const [katRes, domRes] = await Promise.all([
          api.get('/kategori'),
          api.get('/dompet'),
        ]);
        this.kategoriList = katRes.data;
        this.dompetList = domRes.data;
      } catch (err) {
        console.error('Gagal load meta:', err);
      }
    },
    onTipeChange() {
      this.filters.kategori_idArray = [];
    },
    resetFilter() {
      const now = new Date();
      this.selectedMonth = { month: now.getMonth(), year: now.getFullYear() };
      this.filters = { qArray: [], tipe: '', kategori_idArray: [], dompet_id: '' };
      this.loaded = false;
      this.transaksi = [];
    },
    async previewData() {
      this.loading = true;
      this.loaded = false;
      try {
        const params = { ...this.queryParams, page: 1, limit: 1000 };
        const [transaksiRes, ringkasanRes] = await Promise.all([
          api.get('/transaksi', { params }),
          api.get('/transaksi/ringkasan', { params: this.queryParams }),
        ]);
        this.transaksi = transaksiRes.data.data;
        this.summary = ringkasanRes.data;
        this.loaded = true;
      } catch (err) {
        this.showToast('Gagal memuat data preview', 'error');
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async downloadExcel() {
      this.exporting = true;
      try {
        const response = await api.get('/laporan/excel', {
          params: this.queryParams,
          responseType: 'blob',
        });
        this.triggerDownload(response.data, `Laporan_DuitTracker_${this.periodLabel.replaceAll(/\s+/g, '_')}.xlsx`);
        this.showToast('File Excel berhasil didownload!', 'success');
      } catch (err) {
        this.showToast('Gagal export Excel: ' + (err.response?.data?.error || err.message), 'error');
      } finally {
        this.exporting = false;
      }
    },
    async downloadPdf() {
      this.exporting = true;
      try {
        const response = await api.get('/laporan/pdf', {
          params: this.queryParams,
          responseType: 'blob',
        });
        this.triggerDownload(response.data, `Laporan_DuitTracker_${this.periodLabel.replaceAll(/\s+/g, '_')}.pdf`);
        this.showToast('File PDF berhasil didownload!', 'success');
      } catch (err) {
        this.showToast('Gagal export PDF: ' + (err.response?.data?.error || err.message), 'error');
      } finally {
        this.exporting = false;
      }
    },
    triggerDownload(blob, filename) {
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    },
    formatTanggal(val) {
      return new Date(val).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
    onFileSelected(e) {
      this.importFile = e.target.files[0] || null;
      this.importResult = null;
    },
    async doImport() {
      if (!this.importFile) return;
      this.importing = true;
      this.importResult = null;
      try {
        const formData = new FormData();
        formData.append('file', this.importFile);
        const { data } = await api.post('/transaksi/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        this.importResult = data;
        this.showToast(data.message, 'success');
        this.importFile = null;
        if (this.$refs.fileInput) this.$refs.fileInput.value = '';
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Import gagal', 'error');
      } finally {
        this.importing = false;
      }
    },
  },
  mounted() {
    this.loadMeta();
  },
};
</script>

<style scoped>
.btn-export {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  cursor: pointer;
  transition: var(--transition);
  text-align: left;
  flex: 1;
  min-width: 280px;
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: var(--shadow-glow);
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-export.excel:hover:not(:disabled) {
  border-color: #00c897;
  box-shadow: 0 4px 20px rgba(0, 200, 151, 0.2);
}

.btn-export.pdf:hover:not(:disabled) {
  border-color: #ff4757;
  box-shadow: 0 4px 20px rgba(255, 71, 87, 0.2);
}

.export-icon {
  font-size: 36px;
}

.export-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.export-sub {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
