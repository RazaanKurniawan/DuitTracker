<template>
  <div class="tagihan-rutin-page fade-in">
    <div class="page-header">
      <h2>Tagihan & Transaksi Berulang</h2>
      <p>Otomatiskan pencatatan untuk pengeluaran atau pemasukan yang berulang tiap periode</p>
    </div>

    <!-- Header Actions -->
    <div class="actions-bar" style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
      <button class="btn btn-primary" @click="bukaModalBaru" style="background: var(--accent-green);">
        ➕ Tambah Tagihan
      </button>
    </div>

    <!-- Data Table -->
    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>
    
    <div v-else-if="tagihanList.length === 0" class="empty-state">
      <div class="empty-icon">🔁</div>
      <h3>Belum ada transaksi berulang</h3>
      <p>Catat WiFi, Netflix, atau Gaji Bulananmu di sini agar tercatat otomatis.</p>
    </div>

    <div v-else class="data-table-container">
      <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3>{{ tagihanList.length }} Tagihan Berulang</h3>
        <button v-if="selectedIds.length > 0" class="btn btn-danger btn-sm" @click="confirmBulkHapus">
          🗑️ Hapus {{ selectedIds.length }} terpilih
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;"><input type="checkbox" class="custom-checkbox" :checked="isAllSelected" @change="toggleSelectAll" title="Pilih Semua" /></th>
            <th>Status</th>
            <th>Keterangan</th>
            <th>Kategori & Dompet</th>
            <th>Nominal</th>
            <th>Jadwal</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tagihanList" :key="t.id" :class="{'inactive-row': !t.is_active, 'row-selected': selectedIds.includes(t.id)}">
            <td><input type="checkbox" class="custom-checkbox" :checked="selectedIds.includes(t.id)" @change="toggleSelect(t.id)" /></td>
            <td>
              <label class="switch" :title="t.is_active ? 'Nonaktifkan' : 'Aktifkan'">
                <input type="checkbox" :checked="t.is_active" @change="toggleStatus(t)">
                <span class="slider round"></span>
              </label>
            </td>
            <td>
              <div style="font-weight: 600;">{{ t.keterangan || '-' }}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">
                <span class="badge" :class="t.tipe" style="padding: 2px 6px; font-size: 10px;">
                  {{ t.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran' }}
                </span>
              </div>
            </td>
            <td>
              <div>{{ t.kategori_ikon || '📁' }} {{ t.kategori_nama || '-' }}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                {{ t.dompet_ikon || '👛' }} {{ t.dompet_nama || '-' }}
              </div>
            </td>
            <td :style="{ color: t.tipe === 'pemasukan' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }">
              {{ formatRupiah(t.jumlah) }}
            </td>
            <td>
              <div style="text-transform: capitalize; font-weight: 500;">
                Tiap {{ t.frekuensi }}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                Eksekusi Berikutnya: <br/>
                <span :style="{ color: isOverdue(t.tanggal_berikutnya) && t.is_active ? 'var(--accent-red)' : '' }">
                  {{ formatTanggal(t.tanggal_berikutnya) }}
                </span>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 8px;">
                <button class="btn-icon" @click="bukaModalEdit(t)" title="Edit">✏️</button>
                <button class="btn-icon danger" @click="confirmHapus(t)" title="Hapus">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @mousedown.self="tutupModal">
        <div class="modal-container" style="max-width: 600px; width: 90%; position: relative; text-align: left;">
        <h3 class="modal-title" style="margin-bottom: 24px; text-align: center;">{{ isEdit ? 'Edit Transaksi Berulang' : 'Tambah Transaksi Berulang' }}</h3>
        
        <div class="form-group" style="margin-top: 20px;">
          <label>Tipe Data</label>
          <div style="display: flex; gap: 12px;">
            <button class="btn" :class="form.tipe === 'pemasukan' ? 'btn-primary' : 'btn-secondary'" @click="form.tipe = 'pemasukan'; loadRelatedData()" type="button">📈 Pemasukan</button>
            <button class="btn" :class="form.tipe === 'pengeluaran' ? 'btn-primary' : 'btn-secondary'" @click="form.tipe = 'pengeluaran'; loadRelatedData()" type="button">📉 Pengeluaran</button>
          </div>
        </div>

        <div class="form-group">
          <label>Keterangan / Nama Tagihan</label>
          <input type="text" v-model="form.keterangan" class="form-control" placeholder="Contoh: Langganan Netflix" required />
        </div>

        <div class="form-group">
          <label>Nominal (Rp)</label>
          <input type="number" v-model.number="form.jumlah" class="form-control" placeholder="100000" min="0" required />
        </div>

        <div class="form-row" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Siklus / Frekuensi</label>
            <CustomSelect 
              v-model="form.frekuensi"
              :options="[
                { label: 'Harian (Tiap Hari)', value: 'harian' },
                { label: 'Mingguan (Tiap Minggu)', value: 'mingguan' },
                { label: 'Bulanan (Tiap Bulan)', value: 'bulanan' },
                { label: 'Tahunan (Tiap Tahun)', value: 'tahunan' }
              ]"
              placeholder="Pilih Frekuensi"
            />
          </div>
          <div class="form-group" style="position: relative; z-index: 10;">
             <!-- z-index to handle dropdown overlay on DatePicker -->
            <label>Tanggal Mulai / Eksekusi</label>
            <VueDatePicker
              v-model="form.tanggal_mulai"
              :enable-time-picker="false"
              auto-apply
              dark
              format="dd/MM/yyyy"
              teleport="body"
              placeholder="Pilih tanggal"
              input-class-name="dp-custom-input"
            />
          </div>
        </div>

        <div class="form-row" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Kategori</label>
            <CustomSelect 
              v-model="form.kategori_id"
              :options="filteredKategoriList.map(k => ({ label: `${k.ikon} ${k.nama}`, value: k.id }))"
              placeholder="Pilih Kategori"
            />
          </div>
          <div class="form-group">
            <label>Sumber / Tujuan Dana</label>
             <CustomSelect 
              v-model="form.dompet_id"
              :options="dompetList.map(d => ({ label: `${d.ikon} ${d.nama}`, value: d.id }))"
              placeholder="Pilih Dompet"
            />
          </div>
        </div>

        <div class="form-actions" style="margin-top: 24px;">
          <button class="btn btn-secondary" @click="tutupModal">Batal</button>
          <button class="btn btn-primary" @click="simpanTagihan" :disabled="saving">
            {{ saving ? '⏳ Menyimpan...' : '💾 Simpan Jadwal' }}
          </button>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirm"
      :title="bulkDelete ? 'Hapus ' + selectedIds.length + ' Tagihan?' : 'Hapus Tagihan?'"
      :message="bulkDelete ? selectedIds.length + ' tagihan yang dipilih akan dihapus permanen.' : 'Apakah kamu yakin ingin menghapus jadwal rutiin ' + (deleteTarget?.keterangan || '') + '?'"
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
import CustomSelect from '../components/CustomSelect.vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

export default {
  name: 'TagihanRutinView',
  components: { ConfirmModal, CustomSelect, VueDatePicker },
  data() {
    return {
      loading: true,
      saving: false,
      tagihanList: [],
      kategoriList: [],
      dompetList: [],
      showModal: false,
      isEdit: false,
      form: { 
        id: null, 
        tipe: 'pengeluaran',
        keterangan: '',
        jumlah: null,
        frekuensi: 'bulanan',
        tanggal_mulai: new Date(),
        kategori_id: null,
        dompet_id: null
      },
      showConfirm: false,
      deleteTarget: null,
      bulkDelete: false,
      selectedIds: [],
      toast: { show: false, message: '', type: 'success' }
    };
  },
  computed: {
    filteredKategoriList() {
      return this.kategoriList.filter(k => k.tipe === this.form.tipe);
    },
    isAllSelected() {
      return this.tagihanList.length > 0 && this.selectedIds.length === this.tagihanList.length;
    }
  },
  methods: {
    async loadData() {
      this.loading = true;
      try {
        const [tagihanRes, katRes, dompetRes] = await Promise.all([
          api.get('/transaksi-berulang'),
          api.get('/kategori'),
          api.get('/dompet')
        ]);
        this.tagihanList = tagihanRes.data;
        this.kategoriList = katRes.data;
        this.dompetList = dompetRes.data;
      } catch (err) {
        console.error('Error loading data:', err);
        this.showToast('Gagal meload data tagihan', 'error');
      } finally {
        this.loading = false;
      }
    },
    loadRelatedData() {
        // Reset category if type changes
        this.form.kategori_id = null;
    },
    formatTanggal(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    formatDateForApi(date) {
      if (!date) return null;
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    },
    isOverdue(dateString) {
        if (!dateString) return false;
        const target = new Date(dateString);
        target.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        return target <= today;
    },
    bukaModalBaru() {
      this.isEdit = false;
      this.form = { 
        id: null, 
        tipe: 'pengeluaran',
        keterangan: '',
        jumlah: null,
        frekuensi: 'bulanan',
        tanggal_mulai: new Date(),
        kategori_id: null,
        dompet_id: this.dompetList.length > 0 ? this.dompetList[0].id : null
      };
      this.showModal = true;
    },
    bukaModalEdit(t) {
      this.isEdit = true;
      this.form = { 
        ...t, 
        jumlah: parseFloat(t.jumlah),
        tanggal_mulai: t.tanggal_mulai ? new Date(t.tanggal_mulai) : new Date()
      };
      this.showModal = true;
    },
    tutupModal() {
      this.showModal = false;
    },
    async simpanTagihan() {
      if (!this.form.keterangan || !this.form.jumlah || !this.form.frekuensi || !this.form.kategori_id || !this.form.dompet_id || !this.form.tanggal_mulai) {
        this.showToast('Semua field yang wajib harus diisi!', 'error');
        return;
      }
      this.saving = true;
      
      const payload = {
        ...this.form,
        tanggal_mulai: this.formatDateForApi(this.form.tanggal_mulai),
      };

      try {
        if (this.isEdit) {
          await api.put(`/transaksi-berulang/${this.form.id}`, payload);
          this.showToast('Tagihan rutin diperbarui!', 'success');
        } else {
          await api.post('/transaksi-berulang', payload);
          this.showToast('Tagihan rutin berhasil dibuat!', 'success');
        }
        this.tutupModal();
        this.loadData();
      } catch (err) {
        console.error(err);
        this.showToast('Gagal menyimpan jadwal tagihan', 'error');
      } finally {
        this.saving = false;
      }
    },
    async toggleStatus(t) {
      try {
        const baru = !t.is_active;
        await api.patch(`/transaksi-berulang/${t.id}/toggle`, { is_active: baru });
        t.is_active = baru; // update local state
        this.showToast(`Tagihan ${baru ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      } catch (err) {
        console.error(err);
        this.showToast('Gagal mengganti status tagihan', 'error');
        // revert check
        const cb = event.target;
        if(cb) cb.checked = t.is_active;
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
          await api.delete('/transaksi-berulang/bulk/delete', { data: { ids: this.selectedIds } });
          this.showToast(`${this.selectedIds.length} tagihan berhasil dihapus!`, 'success');
          this.selectedIds = [];
          this.bulkDelete = false;
        } else {
          await api.delete(`/transaksi-berulang/${this.deleteTarget.id}`);
          this.showToast('Tagihan berhasil dihapus permanen!', 'success');
        }
        this.loadData();
      } catch (err) {
        this.showToast('Gagal menghapus tagihan', 'error');
      }
    },
    toggleSelect(id) {
      const idx = this.selectedIds.indexOf(id);
      if (idx === -1) this.selectedIds.push(id);
      else this.selectedIds.splice(idx, 1);
    },
    toggleSelectAll() {
      if (this.isAllSelected) this.selectedIds = [];
      else this.selectedIds = this.tagihanList.map(t => t.id);
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    }
  },
  mounted() {
    this.loadData();
  }
};
</script>

<style scoped>
.tagihan-rutin-page {
  max-width: 1200px;
  margin: 0 auto;
}

.inactive-row {
  opacity: 0.6;
}

.inactive-row td {
  filter: grayscale(80%);
}

/* Toggle Switch Styles */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--border-color);
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: var(--accent-green);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--accent-green);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Modal Styles */
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
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: visible; /* Penting agar dropdown CustomSelect bisa keluar batas */
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.85) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
