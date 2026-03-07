<template>
  <div class="anggaran-view">
    <div class="header-actions">
      <div>
        <h2 style="margin-bottom: 8px;">Target Anggaran</h2>
        <p style="color: var(--text-secondary); font-size: 14px;">Atur batas pengeluaran per kategori agar keuangan tetap terkontrol.</p>
      </div>
      <button class="btn btn-primary" @click="bukaModal()">+ Tambah Anggaran</button>
    </div>

    <!-- Filter Bulan & Tahun -->
    <div class="filter-card">
      <div class="form-group flex-1">
        <label>Bulan</label>
        <CustomSelect v-model="filterBulan" :options="bulanOptions" @change="fetchAnggaran" />
      </div>
      <div class="form-group flex-1">
        <label>Tahun</label>
        <CustomSelect v-model="filterTahun" :options="tahunOptions" @change="fetchAnggaran" />
      </div>
    </div>

    <!-- List Anggaran -->
    <div class="anggaran-grid">
      <!-- Empty State -->
      <div v-if="anggaranList.length === 0" class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎯</div>
        <h3>Belum Ada Target Anggaran</h3>
        <p>Kamu belum mengatur batas pengeluaran untuk bulan ini.</p>
        <button class="btn btn-secondary" style="margin-top: 16px;" @click="bukaModal()">Buat Anggaran Baru</button>
      </div>

      <!-- Anggaran Cards -->
      <div v-for="a in anggaranList" :key="a.id" class="anggaran-card">
        <div class="card-header">
          <div class="kategori-info">
            <span class="ikon">{{ a.ikon_kategori }}</span>
            <span class="nama">{{ a.nama_kategori }}</span>
          </div>
          <div class="actions">
            <button class="btn-icon" @click="bukaModal(a)" title="Edit">✏️</button>
            <button class="btn-icon danger" @click="confirmHapus(a)" title="Hapus">🗑️</button>
          </div>
        </div>

        <div class="budget-info">
          <div class="budget-row">
            <span class="label">Terpakai</span>
            <span class="value" :style="{ color: getProgressColor(a).hex }">Rp {{ formatNumber(a.terpakai) }}</span>
          </div>
          <div class="budget-row">
            <span class="label">Dari Total Target</span>
            <span class="value">Rp {{ formatNumber(a.batas_jumlah) }}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-bar-bg">
            <div 
              class="progress-bar-fill"
              :class="getProgressColor(a).class"
              :style="{ width: getProgressWidth(a) + '%' }"
            ></div>
          </div>
          <div class="progress-text">
            <span>{{ getProgressPercentage(a) }}%</span>
            <span v-if="getSisa(a) > 0" class="sisa">Sisa: Rp {{ formatNumber(getSisa(a)) }}</span>
            <span v-else class="over">Overbudget: Rp {{ formatNumber(Math.abs(getSisa(a))) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form (Mengadopsi style ConfirmModal) -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @mousedown.self="tutupModal">
        <div class="modal-container" style="max-width: 480px; width: 90%; position: relative; text-align: left;">
          <h3 class="modal-title" style="margin-bottom: 24px; text-align: center;">{{ isEdit ? 'Edit Target Anggaran' : 'Set Target Anggaran Baru' }}</h3>
          
          <div class="form-group" style="margin-top: 20px;">
            <label>Pilih Kategori Pengeluaran</label>
            <CustomSelect 
              v-model="form.kategori_id" 
              :options="kategoriOptions" 
              placeholder="Pilih Kategori" 
              :disabled="isEdit"
            />
            <small v-if="isEdit" style="color: var(--text-muted); display: block; margin-top: 4px;">Kategori tidak bisa diubah setelah anggaran dibuat.</small>
          </div>

          <div class="form-group">
            <label>Batas Maksimal Pengeluaran (Rp)</label>
            <input type="number" v-model="form.batas_jumlah" placeholder="Contoh: 2000000" class="form-control" />
          </div>

          <div class="form-actions" style="margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn btn-secondary" @click="tutupModal">Batal</button>
            <button class="btn btn-primary" @click="simpanAnggaran">💾 Simpan Target</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirm"
      title="Hapus Target Anggaran?"
      :message="confirmMessage"
      confirmText="Ya, Hapus"
      type="danger"
      @confirm="hapusAnggaran"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script>
import api from '../services/api';
import CustomSelect from '../components/CustomSelect.vue';
import ConfirmModal from '../components/ConfirmModal.vue';

export default {
  name: 'AnggaranView',
  components: { CustomSelect, ConfirmModal },
  data() {
    const today = new Date();
    return {
      anggaranList: [],
      kategoriList: [],
      
      filterBulan: today.getMonth() + 1,
      filterTahun: today.getFullYear(),
      
      showModal: false,
      isEdit: false,
      form: { id: null, kategori_id: '', batas_jumlah: '' },
      
      showConfirm: false,
      selectedItem: null,
      confirmMessage: '',
      
      bulanOptions: [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
        { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
      ],
      tahunOptions: []
    };
  },
  computed: {
    kategoriOptions() {
      // Hanya kategori pengeluaran
      return this.kategoriList
        .filter(k => k.tipe === 'pengeluaran')
        .map(k => ({ value: k.id, label: `${k.ikon} ${k.nama}` }));
    }
  },
  async created() {
    this.generateTahunOptions();
    await this.fetchKategori();
    await this.fetchAnggaran();
  },
  methods: {
    formatNumber(num) {
      if (!num) return '0';
      return parseInt(num).toLocaleString('id-ID');
    },
    generateTahunOptions() {
      const currentYear = new Date().getFullYear();
      for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        this.tahunOptions.push({ value: i, label: i.toString() });
      }
    },
    async fetchKategori() {
      try {
        const res = await api.get('/kategori');
        this.kategoriList = res.data;
      } catch (err) {
        console.error('Gagal memuat kategori', err);
      }
    },
    async fetchAnggaran() {
      try {
        const res = await api.get(`/anggaran?bulan=${this.filterBulan}&tahun=${this.filterTahun}`);
        this.anggaranList = res.data;
      } catch (err) {
        console.error('Gagal memuat anggaran', err);
      }
    },
    
    // Perhitungan Progress Bar
    getSisa(anggaran) {
      return anggaran.batas_jumlah - anggaran.terpakai;
    },
    getProgressPercentage(anggaran) {
      if (anggaran.batas_jumlah == 0) return 0;
      const pct = (anggaran.terpakai / anggaran.batas_jumlah) * 100;
      return pct.toFixed(1);
    },
    getProgressWidth(anggaran) {
      const pct = this.getProgressPercentage(anggaran);
      return pct > 100 ? 100 : pct;
    },
    getProgressColor(anggaran) {
      const pct = this.getProgressPercentage(anggaran);
      if (pct < 70) return { class: 'progress-safe', hex: 'var(--accent-green)' };
      if (pct < 90) return { class: 'progress-warning', hex: 'var(--accent-orange)' };
      return { class: 'progress-danger', hex: 'var(--accent-red)' };
    },

    // Aksi Modal
    bukaModal(item = null) {
      if (item) {
        this.isEdit = true;
        this.form = {
          id: item.id,
          kategori_id: item.kategori_id,
          batas_jumlah: parseInt(item.batas_jumlah)
        };
      } else {
        this.isEdit = false;
        this.form = { id: null, kategori_id: '', batas_jumlah: '' };
      }
      this.showModal = true;
    },
    tutupModal() {
      this.showModal = false;
    },
    async simpanAnggaran() {
      if (!this.form.batas_jumlah) return alert('Batas jumlah harus diisi');
      
      try {
        if (this.isEdit) {
          await api.put(`/anggaran/${this.form.id}`, { batas_jumlah: this.form.batas_jumlah });
        } else {
          if (!this.form.kategori_id) return alert('Kategori harus dipilih');
          await api.post('/anggaran', {
            kategori_id: this.form.kategori_id,
            bulan: this.filterBulan,
            tahun: this.filterTahun,
            batas_jumlah: this.form.batas_jumlah
          });
        }
        this.tutupModal();
        await this.fetchAnggaran();
      } catch (err) {
        console.error('Gagal menyimpan anggaran:', err);
        alert('Gagal menyimpan target anggaran. Cek apakah kategori ini sudah memiliki target di bulan yang sama.');
      }
    },
    
    confirmHapus(item) {
      this.selectedItem = item;
      this.confirmMessage = `Target anggaran untuk kategori ${item.nama_kategori} akan dihapus. Lanjutkan?`;
      this.showConfirm = true;
    },
    async hapusAnggaran() {
      try {
        await api.delete(`/anggaran/${this.selectedItem.id}`);
        this.showConfirm = false;
        await this.fetchAnggaran();
      } catch (err) {
        console.error('Gagal menghapus:', err);
      }
    }
  }
};
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.filter-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.flex-1 { flex: 1; }

.anggaran-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.anggaran-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: var(--transition);
}
.anggaran-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-glow);
  border-color: rgba(67, 97, 238, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}
.kategori-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.kategori-info .ikon {
  font-size: 24px;
  background: rgba(255, 255, 255, 0.05);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.kategori-info .nama {
  font-size: 16px;
  font-weight: 600;
}
.card-header .actions {
  display: flex;
  gap: 8px;
}

.budget-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.budget-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.budget-row .label {
  font-size: 13px;
  color: var(--text-secondary);
}
.budget-row .value {
  font-weight: 700;
  font-size: 16px;
}

/* Progress Bar */
.progress-container {
  margin-top: auto;
}
.progress-bar-bg {
  height: 10px;
  background: var(--bg-input);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.progress-safe { background: var(--accent-green); box-shadow: 0 0 10px rgba(0, 200, 151, 0.4); }
.progress-warning { background: var(--accent-orange); box-shadow: 0 0 10px rgba(255, 159, 67, 0.4); }
.progress-danger { background: var(--accent-red); box-shadow: 0 0 10px rgba(255, 71, 87, 0.4); }

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.progress-text .sisa { color: var(--accent-green); }
.progress-text .over { color: var(--accent-red); }

/* Modal Styles using ConfirmModal style */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 36px 32px 28px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: visible;
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.85) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
</style>
