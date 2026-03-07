<template>
  <div class="tabungan-page fade-in">
    <div class="page-header">
      <h2>🎯 Target Tabungan</h2>
      <p>Kelola target keuanganmu dan pantau progress menabung</p>
    </div>

    <button class="btn btn-primary" @click="bukaModal()" style="margin-bottom: 24px;">
      ➕ Tambah Target
    </button>

    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>

    <div v-else-if="list.length === 0" class="empty-state">
      <div class="empty-icon">🎯</div>
      <h3>Belum ada target tabungan</h3>
      <p>Mulai tetapkan tujuan keuanganmu!</p>
    </div>

    <div v-else class="tabungan-grid">
      <div v-for="t in list" :key="t.id" class="tabungan-card" :class="{ inactive: !t.is_active }" :style="{ '--card-accent': t.warna }">
        <div class="tabungan-header">
          <span class="tabungan-ikon">{{ t.ikon }}</span>
          <div class="tabungan-info">
            <h3>{{ t.nama }}</h3>
            <span v-if="!t.is_active" class="badge" style="font-size: 11px;">Nonaktif</span>
            <span v-if="progress(t) >= 100" class="badge" style="background: var(--accent-green); font-size: 11px;">✅ Tercapai</span>
          </div>
          <div class="tabungan-actions">
            <button class="btn-icon" @click="bukaModal(t)" title="Edit">✏️</button>
            <button class="btn-icon danger" @click="confirmHapus(t)" title="Hapus">🗑️</button>
          </div>
        </div>

        <div class="tabungan-body">
          <div class="progress-info">
            <span>{{ formatRupiah(t.terkumpul) }} <small>/ {{ formatRupiah(t.target_jumlah) }}</small></span>
            <span class="progress-pct">{{ progress(t).toFixed(1) }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: Math.min(progress(t), 100) + '%', background: t.warna }"></div>
          </div>
          <div v-if="t.target_tanggal" class="tabungan-meta">
            🗓️ Target: {{ formatTanggal(t.target_tanggal) }}
            <span v-if="sisaHari(t.target_tanggal) >= 0"> ({{ sisaHari(t.target_tanggal) }} hari lagi)</span>
            <span v-else style="color: var(--accent-red);"> (Sudah lewat)</span>
          </div>
          <div v-if="t.catatan" class="tabungan-meta">📝 {{ t.catatan }}</div>

          <div class="tabungan-setor" v-if="t.is_active">
            <div style="min-width: 160px;">
              <CustomSelect
                v-model="setorDompet[t.id]"
                :options="dompetOptions"
                placeholder="Pilih Dompet"
              />
            </div>
            <input type="number" v-model.number="setorAmount[t.id]" placeholder="Jumlah" class="form-control" style="max-width: 140px;" min="1" />
            <button class="btn btn-primary btn-sm" @click="setor(t)" :disabled="!setorAmount[t.id] || setorAmount[t.id] <= 0 || !setorDompet[t.id]">💰 Setor</button>
            <button class="btn btn-secondary btn-sm" @click="tarik(t)" :disabled="!setorAmount[t.id] || setorAmount[t.id] <= 0 || !setorDompet[t.id]">📤 Tarik</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-container">
        <h3 class="modal-title" style="margin-bottom: 24px; text-align: center;">{{ editingId ? '✏️ Edit Target' : '➕ Target Baru' }}</h3>
        <div class="form-group">
          <label>Nama Target</label>
          <input v-model="form.nama" class="form-control" placeholder="Contoh: Dana Darurat" />
        </div>
        <div class="form-group">
          <label>Target Jumlah</label>
          <input type="number" v-model.number="form.target_jumlah" class="form-control" placeholder="10000000" min="1" />
        </div>
        <div class="form-row" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Ikon</label>
            <CustomSelect
              v-model="form.ikon"
              :options="ikonOptions"
              placeholder="Pilih ikon"
            />
          </div>
          <div class="form-group">
            <label>Warna</label>
            <input type="color" v-model="form.warna" class="form-control" style="height: 42px; padding: 4px;" />
          </div>
        </div>
        <div class="form-group">
          <label>Target Tanggal (Opsional)</label>
          <VueDatePicker
            v-model="form.target_tanggal"
            :enable-time-picker="false"
            auto-apply
            dark
            :clearable="true"
            format="dd/MM/yyyy"
            teleport="body"
            placeholder="Pilih tanggal target"
            input-class-name="dp-custom-input"
          />
        </div>
        <div class="form-group">
          <label>Catatan (Opsional)</label>
          <input v-model="form.catatan" class="form-control" placeholder="Catatan tambahan..." />
        </div>
        <div v-if="editingId" class="form-group">
          <label>
            <input type="checkbox" v-model="form.is_active" /> Aktif
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" @click="simpan">💾 Simpan</button>
          <button class="btn btn-secondary" @click="showModal = false">Batal</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirm"
      title="Hapus Target Tabungan?"
      :message="'Target &quot;' + (deleteTarget?.nama || '') + '&quot; akan dihapus permanen.'"
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
import CustomSelect from '../components/CustomSelect.vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

export default {
  name: 'TabunganView',
  components: { ConfirmModal, CustomSelect, VueDatePicker },
  data() {
    return {
      list: [],
      dompetList: [],
      loading: true,
      showModal: false,
      editingId: null,
      form: this.defaultForm(),
      setorAmount: {},
      setorDompet: {},
      showConfirm: false,
      deleteTarget: null,
      ikonList: ['🎯', '💎', '🏠', '🚗', '✈️', '🎓', '💻', '📱', '👶', '💒', '🏖️', '🎮', '🏥', '📦'],
      toast: { show: false, message: '', type: 'success' },
    };
  },
  computed: {
    dompetOptions() {
      return this.dompetList.map(d => ({ label: `${d.ikon} ${d.nama}`, value: d.id }));
    },
    ikonOptions() {
      return this.ikonList.map(i => ({ label: i, value: i }));
    },
  },
  methods: {
    defaultForm() {
      return { nama: '', target_jumlah: null, ikon: '🎯', warna: '#4361EE', target_tanggal: null, catatan: '', is_active: true };
    },
    async loadData() {
      this.loading = true;
      try {
        const [tabunganRes, dompetRes] = await Promise.all([
          api.get('/tabungan'),
          api.get('/dompet'),
        ]);
        this.list = tabunganRes.data;
        this.dompetList = dompetRes.data;
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    bukaModal(item) {
      if (item) {
        this.editingId = item.id;
        this.form = {
          nama: item.nama,
          target_jumlah: parseFloat(item.target_jumlah),
          ikon: item.ikon,
          warna: item.warna,
          target_tanggal: item.target_tanggal ? new Date(item.target_tanggal) : null,
          catatan: item.catatan || '',
          is_active: item.is_active,
        };
      } else {
        this.editingId = null;
        this.form = this.defaultForm();
      }
      this.showModal = true;
    },
    async simpan() {
      if (!this.form.nama || !this.form.target_jumlah) {
        this.showToast('Nama dan target jumlah wajib diisi', 'error');
        return;
      }
      try {
        const payload = {
          ...this.form,
          target_tanggal: this.form.target_tanggal ? this.formatDateForApi(this.form.target_tanggal) : null,
        };
        if (this.editingId) {
          await api.put(`/tabungan/${this.editingId}`, payload);
        } else {
          await api.post('/tabungan', payload);
        }
        this.showModal = false;
        await this.loadData();
        this.showToast('Target berhasil disimpan!', 'success');
      } catch (err) {
        this.showToast('Gagal menyimpan', 'error');
      }
    },
    formatDateForApi(date) {
      if (!date) return null;
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    },
    async setor(t) {
      const jumlah = this.setorAmount[t.id];
      const dompet_id = this.setorDompet[t.id];
      if (!jumlah || jumlah <= 0 || !dompet_id) return;
      try {
        await api.post(`/tabungan/${t.id}/setor`, { jumlah, dompet_id });
        this.setorAmount[t.id] = null;
        await this.loadData();
        this.showToast(`Berhasil setor ${this.formatRupiah(jumlah)}`, 'success');
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal setor', 'error');
      }
    },
    async tarik(t) {
      const jumlah = this.setorAmount[t.id];
      const dompet_id = this.setorDompet[t.id];
      if (!jumlah || jumlah <= 0 || !dompet_id) return;
      try {
        await api.post(`/tabungan/${t.id}/tarik`, { jumlah, dompet_id });
        this.setorAmount[t.id] = null;
        await this.loadData();
        this.showToast(`Berhasil tarik ${this.formatRupiah(jumlah)}`, 'success');
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal tarik', 'error');
      }
    },
    confirmHapus(t) {
      this.deleteTarget = t;
      this.showConfirm = true;
    },
    async doHapus() {
      try {
        await api.delete(`/tabungan/${this.deleteTarget.id}`);
        this.showConfirm = false;
        await this.loadData();
        this.showToast('Target berhasil dihapus', 'success');
      } catch (err) {
        this.showToast('Gagal menghapus', 'error');
      }
    },
    progress(t) {
      if (!t.target_jumlah || t.target_jumlah === 0) return 0;
      return (parseFloat(t.terkumpul) / parseFloat(t.target_jumlah)) * 100;
    },
    sisaHari(tanggal) {
      const target = new Date(tanggal);
      const now = new Date();
      return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    formatTanggal(d) {
      return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
  async mounted() {
    await this.loadData();
  },
};
</script>

<style scoped>
.tabungan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}
.tabungan-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: var(--transition);
}
.tabungan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}
.tabungan-card.inactive {
  opacity: 0.6;
}
.tabungan-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 0 20px;
}
.tabungan-ikon {
  font-size: 32px;
}
.tabungan-info {
  flex: 1;
}
.tabungan-info h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}
.tabungan-actions {
  display: flex;
  gap: 6px;
}
.tabungan-body {
  padding: 16px 20px 20px 20px;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-primary);
}
.progress-info small {
  color: var(--text-secondary);
}
.progress-pct {
  font-weight: 700;
  color: var(--card-accent, var(--accent-blue));
}
.progress-bar-bg {
  width: 100%;
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 5px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}
.tabungan-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 10px;
}
.tabungan-setor {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  align-items: center;
}
.tabungan-setor .form-control {
  margin-bottom: 0;
}

/* Modal */
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
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl, 16px);
  padding: 36px 32px 28px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes modalPop {
  from { opacity: 0; transform: scale(0.85) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
