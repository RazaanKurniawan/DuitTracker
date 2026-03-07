<template>
  <div class="dompet-page fade-in">
    <div class="page-header">
      <h2>Kelola Dompet / Rekening</h2>
      <p>Atur sumber dana untuk pemasukan dan pengeluaranmu</p>
    </div>

    <!-- Header Actions -->
    <div class="actions-bar" style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
      <button class="btn btn-primary" @click="bukaModalBaru" style="background: var(--accent-green);">
        ➕ Tambah Dompet
      </button>
    </div>

    <!-- Dompet Grid -->
    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>
    
    <div v-else-if="dompetList.length === 0" class="empty-state">
      <div class="empty-icon">👛</div>
      <h3>Belum ada dompet</h3>
      <p>Silakan tambah dompet atau rekening baru.</p>
    </div>

    <div v-else class="dashboard-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
      <!-- Wallet Card -->
      <div v-for="d in dompetList" :key="d.id" class="stat-card" style="border-top: 4px solid; position: relative;" :style="{ borderTopColor: d.warna || 'var(--accent-blue)' }">
        
        <!-- Actions (Edit/Delete) on hover/top right -->
        <div class="card-actions" style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
          <button class="btn-icon" @click="bukaModalEdit(d)" title="Edit">✏️</button>
          <button class="btn-icon danger" @click="confirmHapus(d)" title="Hapus">🗑️</button>
        </div>

        <div class="stat-icon" :style="{ background: d.warna ? d.warna + '20' : 'rgba(67, 97, 238, 0.1)', color: d.warna || 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px' }">
          {{ d.ikon || '👛' }}
        </div>
        <div class="stat-info" style="margin-top: 16px;">
          <div class="stat-label" style="font-size: 16px; color: var(--text-primary); font-weight: 600;">{{ d.nama }}</div>
          <div class="stat-value" style="font-size: 24px; margin-top: 8px;">
            {{ formatMataUang(d.saldo_saat_ini !== undefined ? d.saldo_saat_ini : d.saldo_awal, d.mata_uang) }}
          </div>
          <div class="stat-label" style="font-size: 12px; margin-top: 4px;">
            Saldo Awal: {{ formatMataUang(d.saldo_awal, d.mata_uang) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Dompet -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @mousedown.self="tutupModal">
        <div class="modal-container" style="max-width: 400px; width: 90%; position: relative; text-align: left;">
          <h3 class="modal-title" style="margin-bottom: 24px; text-align: center;">{{ isEdit ? 'Edit Dompet' : 'Tambah Dompet' }}</h3>
        
        <div class="form-group" style="margin-top: 20px;">
          <label>Nama Dompet / Rekening</label>
          <input type="text" v-model="form.nama" class="form-control" placeholder="Contoh: BCA, Jago, Tunai" autofocus required />
        </div>

        <div class="form-group">
          <label>Saldo Awal (Rp)</label>
          <input type="number" v-model.number="form.saldo_awal" class="form-control" placeholder="Contoh: 1000000" min="0" />
        </div>

        <div class="form-row" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Ikon (Emoji)</label>
            <input type="text" v-model="form.ikon" class="form-control" placeholder="👛" maxlength="2" />
          </div>
          <div class="form-group">
            <label>Warna Tema</label>
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="color" v-model="form.warna" style="width: 40px; height: 40px; border: none; border-radius: 8px; cursor: pointer; background: transparent; padding: 0;" />
              <span style="font-family: monospace; color: var(--text-secondary);">{{ form.warna }}</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Mata Uang</label>
          <select v-model="form.mata_uang" class="form-control">
            <option value="IDR">IDR - Rupiah</option>
            <option value="USD">USD - Dollar AS</option>
            <option value="EUR">EUR - Euro</option>
            <option value="SGD">SGD - Dollar Singapura</option>
            <option value="MYR">MYR - Ringgit Malaysia</option>
            <option value="JPY">JPY - Yen Jepang</option>
            <option value="GBP">GBP - Pound Sterling</option>
            <option value="AUD">AUD - Dollar Australia</option>
            <option value="CNY">CNY - Yuan Tiongkok</option>
          </select>
        </div>

        <div class="form-actions" style="margin-top: 24px;">
          <button class="btn btn-secondary" @click="tutupModal">Batal</button>
          <button class="btn btn-primary" @click="simpanDompet" :disabled="saving">
            {{ saving ? '⏳ Menyimpan...' : '💾 Simpan' }}
          </button>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirm"
      title="Hapus Dompet?"
      :message="'Apakah kamu yakin ingin menghapus dompet ' + (deleteTarget?.nama || '') + '? Pastikan tidak ada transaksi yang terikat dengan dompet ini.'"
      confirmText="Ya, Hapus"
      type="danger"
      @confirm="doHapus"
      @cancel="showConfirm = false"
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
  name: 'DompetView',
  components: { ConfirmModal },
  data() {
    return {
      loading: true,
      saving: false,
      dompetList: [],
      showModal: false,
      isEdit: false,
      form: { id: null, nama: '', saldo_awal: 0, ikon: '👛', warna: '#4361EE', mata_uang: 'IDR' },
      showConfirm: false,
      deleteTarget: null,
      toast: { show: false, message: '', type: 'success' }
    };
  },
  methods: {
    async loadDompet() {
      this.loading = true;
      try {
        const { data } = await api.get('/dompet');
        this.dompetList = data;
      } catch (err) {
        console.error('Error loading dompet:', err);
        this.showToast('Gagal meload data dompet', 'error');
      } finally {
        this.loading = false;
      }
    },
    bukaModalBaru() {
      this.isEdit = false;
      this.form = { id: null, nama: '', saldo_awal: 0, ikon: '👛', warna: '#4361EE', mata_uang: 'IDR' };
      this.showModal = true;
    },
    bukaModalEdit(d) {
      this.isEdit = true;
      this.form = { ...d, saldo_awal: parseFloat(d.saldo_awal), mata_uang: d.mata_uang || 'IDR' };
      this.showModal = true;
    },
    tutupModal() {
      this.showModal = false;
    },
    async simpanDompet() {
      if (!this.form.nama) {
        this.showToast('Nama dompet harus diisi!', 'error');
        return;
      }
      this.saving = true;
      try {
        if (this.isEdit) {
          await api.put(`/dompet/${this.form.id}`, this.form);
          this.showToast('Dompet berhasil diupdate!', 'success');
        } else {
          await api.post('/dompet', this.form);
          this.showToast('Dompet berhasil ditambah!', 'success');
        }
        this.tutupModal();
        this.loadDompet();
      } catch (err) {
        console.error(err);
        this.showToast('Gagal menyimpan dompet', 'error');
      } finally {
        this.saving = false;
      }
    },
    confirmHapus(d) {
      this.deleteTarget = d;
      this.showConfirm = true;
    },
    async doHapus() {
      this.showConfirm = false;
      try {
        await api.delete(`/dompet/${this.deleteTarget.id}`);
        this.showToast('Dompet berhasil dihapus!', 'success');
        this.loadDompet();
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          this.showToast(err.response.data.error, 'error');
        } else {
          this.showToast('Gagal menghapus dompet', 'error');
        }
      }
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    formatMataUang(val, currency) {
      const cur = currency || 'IDR';
      try {
        return Number(val).toLocaleString('id-ID', { style: 'currency', currency: cur, maximumFractionDigits: 2 });
      } catch {
        return cur + ' ' + Number(val).toLocaleString('id-ID');
      }
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    }
  },
  mounted() {
    this.loadDompet();
  }
};
</script>

<style scoped>
.dompet-page {
  max-width: 1200px;
  margin: 0 auto;
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
  overflow: visible; 
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.85) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
