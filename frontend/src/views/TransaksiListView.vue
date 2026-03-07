<template>
  <div class="transaksi-list-page fade-in">
    <div class="page-header">
      <h2>Daftar Transaksi</h2>
      <p>Cari, filter, dan kelola semua riwayat keuanganmu</p>
    </div>

    <!-- Filter Bar - Extended -->
    <div class="filters-container form-card" style="margin-bottom: 24px; max-width: 100%; padding: 24px;">
      <div class="form-row" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        
        <!-- Search -->
        <div class="form-group" style="margin-bottom: 0;">
          <label>Pencarian</label>
          <CustomTagInput 
            v-model="filters.qArray" 
            placeholder="Ketik tag lalu Enter..." 
          />
        </div>

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
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 12px; margin-top: 20px; align-items: center;">
        <button class="btn btn-primary" @click="applyFilter">🔍 Terapkan Filter</button>
        <button class="btn btn-secondary" @click="resetFilter" title="Reset Filter">🔄 Reset</button>
        
        <router-link to="/transaksi/tambah" class="btn btn-primary" style="margin-left: auto; background: var(--accent-green); box-shadow: 0 4px 15px rgba(0, 200, 151, 0.3);">
          ➕ Tambah Transaksi
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>

    <div v-else-if="transaksi.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>Tidak ada hasil ditemukan</h3>
      <p>Coba sesuaikan filter pencarianmu atau tambah transaksi baru.</p>
    </div>

    <!-- Data Table -->
    <div v-else class="data-table-container">
      <div class="table-header">
        <h3>Menampilkan {{ transaksi.length }} dari {{ pagination.total }} Transaksi</h3>
        <button v-if="selectedIds.length > 0" class="btn btn-danger btn-sm" @click="confirmBulkHapus">
          🗑️ Hapus {{ selectedIds.length }} terpilih
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;"><input type="checkbox" class="custom-checkbox" :checked="isAllSelected" @change="toggleSelectAll" title="Pilih Semua" /></th>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Sumber Dana</th>
            <th>Keterangan</th>
            <th>Tipe</th>
            <th>Jumlah</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in transaksi" :key="t.id" :class="{ 'row-selected': selectedIds.includes(t.id) }">
            <td><input type="checkbox" class="custom-checkbox" :checked="selectedIds.includes(t.id)" @change="toggleSelect(t.id)" /></td>
            <td>{{ formatTanggal(t.tanggal) }}</td>
            <td>{{ t.kategori_ikon || '📁' }} {{ t.kategori_nama || '-' }}</td>
            <td>{{ t.dompet_ikon || '👛' }} {{ t.dompet_nama || 'Utama' }}</td>
            <td>{{ t.keterangan || '-' }} <span v-if="t.foto" title="Klik untuk lihat foto struk" style="cursor:pointer" @click="lihatFoto(t)">📷</span></td>
            <td>
              <span class="badge" :class="t.tipe">
                {{ t.tipe === 'pemasukan' ? '📈' : '📉' }}
                {{ t.tipe }}
              </span>
            </td>
            <td :style="{ color: t.tipe === 'pemasukan' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }">
              {{ t.tipe === 'pemasukan' ? '+' : '-' }} {{ formatRupiah(t.jumlah) }}
            </td>
            <td>
              <div style="display: flex; gap: 8px;">
                <router-link :to="'/transaksi/edit/' + t.id" class="btn-icon" title="Edit">✏️</router-link>
                <button class="btn-icon danger" @click="confirmHapus(t)" title="Hapus">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Controls -->
    <div class="pagination-bar fade-in" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;" v-if="!loading && transaksi.length > 0">
      <div style="color: var(--text-secondary); font-size: 14px;">
        Halaman <strong>{{ pagination.page }}</strong> dari <strong>{{ pagination.total_pages }}</strong>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">
          ← Sebelumnya
        </button>
        <button class="btn btn-secondary btn-sm" :disabled="pagination.page >= pagination.total_pages" @click="changePage(pagination.page + 1)">
          Selanjutnya →
        </button>
      </div>
    </div>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirm"
      :title="bulkDelete ? 'Hapus ' + selectedIds.length + ' Transaksi?' : 'Hapus Transaksi?'"
      :message="bulkDelete ? selectedIds.length + ' transaksi yang dipilih akan dihapus permanen.' : 'Transaksi ' + (deleteTarget?.keterangan || '') + ' sebesar ' + formatRupiah(deleteTarget?.jumlah || 0) + ' akan dihapus permanen.'"
      confirmText="Ya, Hapus"
      type="danger"
      @confirm="doHapus"
      @cancel="showConfirm = false; bulkDelete = false"
    />

    <!-- Foto Lightbox -->
    <Teleport to="body">
      <div v-if="fotoPreview" class="foto-overlay" @click="fotoPreview = null">
        <div class="foto-lightbox" @click.stop>
          <button class="foto-close" @click="fotoPreview = null">✕</button>
          <img :src="fotoPreview" alt="Foto Struk" />
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.type === 'success' ? '✅' : '❌' }} {{ toast.message }}
    </div>
  </div>
</template>

<script>
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal.vue';
import CustomSelect from '../components/CustomSelect.vue';
import CustomTagInput from '../components/CustomTagInput.vue';
import CustomDropdownTags from '../components/CustomDropdownTags.vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

export default {
  name: 'TransaksiListView',
  components: { ConfirmModal, VueDatePicker, CustomSelect, CustomTagInput, CustomDropdownTags },
  data() {
    const now = new Date();
    return {
      loading: true,
      transaksi: [],
      kategoriList: [],
      dompetList: [],
      selectedMonth: { month: now.getMonth(), year: now.getFullYear() },
      filters: {
        qArray: [], // array of strings for multiple tags
        tipe: '',
        kategori_idArray: [], // array of IDs for multiple categories
        dompet_id: ''
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 1
      },
      showConfirm: false,
      deleteTarget: null,
      bulkDelete: false,
      selectedIds: [],
      fotoPreview: null,
      toast: { show: false, message: '', type: 'success' },
    };
  },
  computed: {
    filteredKategoriList() {
      if (!this.filters.tipe) return this.kategoriList;
      return this.kategoriList.filter(k => k.tipe === this.filters.tipe);
    },
    isAllSelected() {
      return this.transaksi.length > 0 && this.selectedIds.length === this.transaksi.length;
    }
  },
  methods: {
    async loadKategori() {
      try {
        const { data } = await api.get('/kategori');
        this.kategoriList = data;
      } catch (err) {
        console.error('Gagal meload kategori', err);
      }
    },
    async loadDompet() {
      try {
        const { data } = await api.get('/dompet');
        this.dompetList = data;
      } catch (err) {
        console.error('Gagal meload dompet', err);
      }
    },
    onTipeChange() {
      // Reset kategori array if tipe changed
      this.filters.kategori_idArray = [];
    },
    applyFilter() {
      this.pagination.page = 1;
      this.fetchTransaksi();
    },
    resetFilter() {
      const now = new Date();
      this.selectedMonth = { month: now.getMonth(), year: now.getFullYear() };
      this.filters = { qArray: [], tipe: '', kategori_idArray: [], dompet_id: '' };
      this.pagination.page = 1;
      this.fetchTransaksi();
    },
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.total_pages) {
        this.pagination.page = newPage;
        this.fetchTransaksi();
      }
    },
    async fetchTransaksi() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          // Join qArray strings with commas for the backend API
          q: this.filters.qArray.length > 0 ? this.filters.qArray.join(',') : '',
          tipe: this.filters.tipe,
          // Join kategori_idArray with commas for backend API
          kategori_id: this.filters.kategori_idArray.length > 0 ? this.filters.kategori_idArray.join(',') : '',
          dompet_id: this.filters.dompet_id || undefined
        };
        
        if (this.selectedMonth) {
          params.bulan = this.selectedMonth.month + 1;
          params.tahun = this.selectedMonth.year;
        }

        const { data } = await api.get('/transaksi', { params });
        this.transaksi = data.data;
        this.pagination = data.pagination;
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        this.loading = false;
      }
    },
    confirmHapus(t) {
      this.deleteTarget = t;
      this.bulkDelete = false;
      this.showConfirm = true;
    },
    confirmBulkHapus() {
      this.bulkDelete = true;
      this.showConfirm = true;
    },
    async doHapus() {
      this.showConfirm = false;
      try {
        if (this.bulkDelete) {
          await api.delete('/transaksi/bulk/delete', { data: { ids: this.selectedIds } });
          this.showToast(`${this.selectedIds.length} transaksi berhasil dihapus!`, 'success');
          this.selectedIds = [];
          this.bulkDelete = false;
        } else {
          await api.delete(`/transaksi/${this.deleteTarget.id}`);
          this.showToast('Transaksi berhasil dihapus!', 'success');
        }
        this.fetchTransaksi();
      } catch (err) {
        this.showToast('Gagal menghapus transaksi', 'error');
      }
    },
    toggleSelect(id) {
      const idx = this.selectedIds.indexOf(id);
      if (idx === -1) this.selectedIds.push(id);
      else this.selectedIds.splice(idx, 1);
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedIds = [];
      } else {
        this.selectedIds = this.transaksi.map(t => t.id);
      }
    },
    formatTanggal(val) {
      return new Date(val).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    lihatFoto(t) {
      this.fotoPreview = 'http://localhost:3000' + t.foto;
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
  async mounted() {
    await Promise.all([this.loadKategori(), this.loadDompet()]);
    // Support global search query param
    if (this.$route.query.q) {
      this.filters.qArray = [this.$route.query.q];
    }
    this.fetchTransaksi();
  },
};
</script>

<style scoped>
.foto-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}
.foto-lightbox {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}
.foto-lightbox img {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.foto-close {
  position: absolute;
  top: -12px; right: -12px;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--accent-red, #e74c3c);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  z-index: 1;
}
.foto-close:hover {
  transform: scale(1.1);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
