<template>
  <div class="kategori-page fade-in">
    <div class="page-header">
      <h2>Kelola Kategori</h2>
      <p>Tambah atau hapus kategori pemasukan & pengeluaran</p>
    </div>

    <!-- Form Tambah -->
    <div class="form-card" style="margin-bottom: 28px;">
      <h3 style="margin-bottom: 16px; font-size: 16px;">➕ Tambah Kategori Baru</h3>
      <div class="form-row" style="grid-template-columns: 1fr 1fr 80px;">
        <div class="form-group" style="margin-bottom: 0;">
          <input v-model="newKategori.nama" type="text" class="form-control" placeholder="Nama kategori" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <select v-model="newKategori.tipe" class="form-control">
            <option value="pengeluaran">📉 Pengeluaran</option>
            <option value="pemasukan">📈 Pemasukan</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <input v-model="newKategori.ikon" type="text" class="form-control" placeholder="📁" maxlength="4" style="text-align: center; font-size: 20px;" />
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top: 16px;" @click="tambahKategori" :disabled="!newKategori.nama">
        💾 Simpan
      </button>
    </div>

    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>

    <template v-else>
      <div class="dashboard-grid">
        <!-- Pengeluaran -->
        <div class="data-table-container">
          <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>📉 Kategori Pengeluaran</h3>
            <button v-if="selectedPengeluaranIds.length > 0" class="btn btn-danger btn-sm" @click="confirmBulkHapus('pengeluaran')">
              🗑️ Hapus {{ selectedPengeluaranIds.length }} terpilih
            </button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;"><input type="checkbox" class="custom-checkbox" :checked="isAllPengeluaranSelected" @change="toggleSelectAllPengeluaran" title="Pilih Semua" /></th>
                <th>Ikon</th>
                <th>Nama</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in pengeluaranKategori" :key="k.id" :class="{ 'row-selected': selectedPengeluaranIds.includes(k.id) }">
                <td><input type="checkbox" class="custom-checkbox" :checked="selectedPengeluaranIds.includes(k.id)" @change="toggleSelectPengeluaran(k.id)" /></td>
                <td style="font-size: 22px;">{{ k.ikon }}</td>
                <td>{{ k.nama }}</td>
                <td>
                  <button class="btn-icon danger" @click="confirmHapus(k)" title="Hapus">🗑️</button>
                </td>
              </tr>
              <tr v-if="pengeluaranKategori.length === 0">
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada kategori</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pemasukan -->
        <div class="data-table-container">
          <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>📈 Kategori Pemasukan</h3>
            <button v-if="selectedPemasukanIds.length > 0" class="btn btn-danger btn-sm" @click="confirmBulkHapus('pemasukan')">
              🗑️ Hapus {{ selectedPemasukanIds.length }} terpilih
            </button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;"><input type="checkbox" class="custom-checkbox" :checked="isAllPemasukanSelected" @change="toggleSelectAllPemasukan" title="Pilih Semua" /></th>
                <th>Ikon</th>
                <th>Nama</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in pemasukanKategori" :key="k.id" :class="{ 'row-selected': selectedPemasukanIds.includes(k.id) }">
                <td><input type="checkbox" class="custom-checkbox" :checked="selectedPemasukanIds.includes(k.id)" @change="toggleSelectPemasukan(k.id)" /></td>
                <td style="font-size: 22px;">{{ k.ikon }}</td>
                <td>{{ k.nama }}</td>
                <td>
                  <button class="btn-icon danger" @click="confirmHapus(k)" title="Hapus">🗑️</button>
                </td>
              </tr>
              <tr v-if="pemasukanKategori.length === 0">
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada kategori</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirm"
      :title="bulkDelete ? 'Hapus ' + bulkDeleteIds.length + ' Kategori?' : 'Hapus Kategori?'"
      :message="bulkDelete ? bulkDeleteIds.length + ' kategori yang dipilih akan dihapus. Transaksi yang menggunakan kategori ini tetap ada.' : 'Kategori ' + (deleteTarget?.ikon || '') + ' ' + (deleteTarget?.nama || '') + ' akan dihapus. Transaksi yang menggunakan kategori ini tetap ada.'"
      confirmText="Ya, Hapus"
      type="danger"
      @confirm="doHapus"
      @cancel="showConfirm = false; bulkDelete = false"
    />

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.type === 'success' ? '✅' : '❌' }} {{ toast.message }}
    </div>
  </div>
</template>

<script>
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal.vue';

export default {
  name: 'KategoriView',
  components: { ConfirmModal },
  data() {
    return {
      loading: true,
      kategoriList: [],
      newKategori: { nama: '', tipe: 'pengeluaran', ikon: '📁' },
      showConfirm: false,
      deleteTarget: null,
      bulkDelete: false,
      bulkDeleteIds: [],
      bulkDeleteType: null,
      selectedPengeluaranIds: [],
      selectedPemasukanIds: [],
      toast: { show: false, message: '', type: 'success' },
    };
  },
  computed: {
    pengeluaranKategori() {
      return this.kategoriList.filter(k => k.tipe === 'pengeluaran');
    },
    pemasukanKategori() {
      return this.kategoriList.filter(k => k.tipe === 'pemasukan');
    },
    isAllPengeluaranSelected() {
      return this.pengeluaranKategori.length > 0 && this.selectedPengeluaranIds.length === this.pengeluaranKategori.length;
    },
    isAllPemasukanSelected() {
      return this.pemasukanKategori.length > 0 && this.selectedPemasukanIds.length === this.pemasukanKategori.length;
    },
  },
  methods: {
    async fetchKategori() {
      this.loading = true;
      try {
        const { data } = await api.get('/kategori');
        this.kategoriList = data;
      } catch (err) {
        console.error('Error:', err);
      } finally {
        this.loading = false;
      }
    },
    async tambahKategori() {
      if (!this.newKategori.nama) return;
      try {
        await api.post('/kategori', this.newKategori);
        this.showToast('Kategori berhasil ditambahkan!', 'success');
        this.newKategori = { nama: '', tipe: 'pengeluaran', ikon: '📁' };
        this.fetchKategori();
      } catch (err) {
        this.showToast('Gagal menambahkan kategori', 'error');
      }
    },
    confirmHapus(k) {
      this.deleteTarget = k;
      this.bulkDelete = false;
      this.showConfirm = true;
    },
    confirmBulkHapus(tipe) {
      this.bulkDeleteType = tipe;
      this.bulkDeleteIds = tipe === 'pengeluaran' ? [...this.selectedPengeluaranIds] : [...this.selectedPemasukanIds];
      this.bulkDelete = true;
      this.showConfirm = true;
    },
    async doHapus() {
      this.showConfirm = false;
      try {
        if (this.bulkDelete) {
          await api.delete('/kategori/bulk/delete', { data: { ids: this.bulkDeleteIds } });
          this.showToast(`${this.bulkDeleteIds.length} kategori berhasil dihapus!`, 'success');
          if (this.bulkDeleteType === 'pengeluaran') this.selectedPengeluaranIds = [];
          else this.selectedPemasukanIds = [];
          this.bulkDelete = false;
        } else {
          await api.delete(`/kategori/${this.deleteTarget.id}`);
          this.showToast('Kategori berhasil dihapus!', 'success');
        }
        this.fetchKategori();
      } catch (err) {
        this.showToast('Gagal menghapus kategori', 'error');
      }
    },
    toggleSelectPengeluaran(id) {
      const idx = this.selectedPengeluaranIds.indexOf(id);
      if (idx === -1) this.selectedPengeluaranIds.push(id);
      else this.selectedPengeluaranIds.splice(idx, 1);
    },
    toggleSelectAllPengeluaran() {
      if (this.isAllPengeluaranSelected) this.selectedPengeluaranIds = [];
      else this.selectedPengeluaranIds = this.pengeluaranKategori.map(k => k.id);
    },
    toggleSelectPemasukan(id) {
      const idx = this.selectedPemasukanIds.indexOf(id);
      if (idx === -1) this.selectedPemasukanIds.push(id);
      else this.selectedPemasukanIds.splice(idx, 1);
    },
    toggleSelectAllPemasukan() {
      if (this.isAllPemasukanSelected) this.selectedPemasukanIds = [];
      else this.selectedPemasukanIds = this.pemasukanKategori.map(k => k.id);
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
  mounted() {
    this.fetchKategori();
  },
};
</script>
