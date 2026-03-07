<template>
  <div class="m-page">
    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="tabunganList.length === 0" class="m-empty">
      <div class="m-empty-icon">💎</div>
      <p>Belum ada target tabungan</p>
    </div>

    <template v-else>
      <div v-for="t in tabunganList" :key="t.id" class="m-card">
        <div class="m-sav-header">
          <span class="m-sav-name">{{ t.nama }}</span>
          <div class="m-act-btns">
            <button @click="openEdit(t)" class="m-btn-icon">✏️</button>
            <button @click="hapus(t)" class="m-btn-icon">🗑️</button>
          </div>
        </div>
        <div class="m-sav-amounts">
          {{ formatRp(t.terkumpul) }} / {{ formatRp(t.target_jumlah) }}
        </div>
        <div class="m-progress">
          <div class="m-progress-bar" :style="{ width: persen(t) + '%', background: 'var(--accent-gradient)' }"></div>
        </div>
        <div class="m-sav-meta">
          <span>{{ persen(t) }}% tercapai</span>
          <span v-if="t.target_tanggal">Target: {{ formatDate(t.target_tanggal) }}</span>
        </div>
        <div class="m-sav-actions">
          <button class="m-btn m-btn-sm m-btn-primary" @click="openDeposit(t)">💰 Setor</button>
          <button class="m-btn m-btn-sm m-btn-secondary" @click="openWithdraw(t)">💸 Tarik</button>
        </div>
      </div>
    </template>

    <button class="m-fab" @click="openAdd">➕</button>

    <!-- Form Modal -->
    <MobileModal v-model="showFormModal" :title="editId ? 'Edit Tabungan' : 'Tambah Tabungan'">
      <div class="m-form-group">
        <label>Nama Tabungan</label>
        <input v-model="form.nama" class="m-input" placeholder="Contoh: Dana Darurat" />
      </div>
      <div class="m-form-group">
        <label>Target Jumlah</label>
        <input type="number" v-model.number="form.target_jumlah" class="m-input" placeholder="0" inputmode="numeric" />
      </div>
      <div class="m-form-group">
        <label>Target Tanggal</label>
        <input type="date" v-model="form.target_tanggal" class="m-input" />
      </div>
      <div class="m-form-group">
        <label>Catatan</label>
        <input v-model="form.catatan" class="m-input" placeholder="Opsional" />
      </div>
      <button class="m-btn m-btn-primary m-btn-block" @click="simpan" :disabled="submitting">
        {{ submitting ? 'Menyimpan...' : '💾 Simpan' }}
      </button>
    </MobileModal>

    <!-- Deposit/Withdraw Modal -->
    <MobileModal v-model="showAmountModal" :title="amountMode === 'setor' ? '💰 Setor Dana' : '💸 Tarik Dana'">
      <div class="m-form-group">
        <label>Dompet</label>
        <MobileSelect
          v-model="amountDompetId"
          :options="dompetOptions"
          label="Pilih Dompet"
          placeholder="-- Pilih Dompet --"
        />
      </div>
      <div class="m-form-group">
        <label>Jumlah (Rp)</label>
        <input type="number" v-model.number="amountValue" class="m-input" placeholder="0" inputmode="numeric" />
      </div>
      <button
        class="m-btn m-btn-block"
        :class="amountMode === 'setor' ? 'm-btn-primary' : 'm-btn-danger'"
        @click="submitAmount"
        :disabled="submitting"
      >
        {{ submitting ? 'Proses...' : (amountMode === 'setor' ? 'Setor' : 'Tarik') }}
      </button>
    </MobileModal>

    <MobileConfirm v-model="showConfirm" :message="confirmMsg" @confirm="doDelete" />
    <div v-if="toast" class="m-toast" :class="toastType">{{ toast }}</div>
  </div>
</template>

<script>
import api from '../../services/api';
import MobileModal from '../components/MobileModal.vue';
import MobileSelect from '../components/MobileSelect.vue';
import MobileConfirm from '../components/MobileConfirm.vue';

export default {
  name: 'MobileTabungan',
  components: { MobileModal, MobileSelect, MobileConfirm },
  data() {
    return {
      loading: true,
      tabunganList: [],
      showFormModal: false,
      showAmountModal: false,
      editId: null,
      form: { nama: '', target_jumlah: '', target_tanggal: '', catatan: '' },
      amountMode: 'setor',
      amountValue: '',
      amountDompetId: '',
      selectedId: null,
      dompetList: [],
      submitting: false,
      toast: '',
      toastType: 'success',
      showConfirm: false,
      confirmMsg: '',
      deleteTarget: null,
    };
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        this.tabunganList = (await api.get('/tabungan')).data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    persen(t) {
      const target = Number(t.target_jumlah) || 0;
      const terkumpul = Number(t.terkumpul) || 0;
      return target ? Math.min(100, Math.round((terkumpul / target) * 100)) : 0;
    },
    openAdd() {
      this.editId = null;
      this.form = { nama: '', target_jumlah: '', target_tanggal: '', catatan: '' };
      this.showFormModal = true;
    },
    openEdit(t) {
      this.editId = t.id;
      this.form = {
        nama: t.nama,
        target_jumlah: t.target_jumlah,
        target_tanggal: t.target_tanggal?.slice(0, 10) || '',
        catatan: t.catatan || '',
      };
      this.showFormModal = true;
    },
    openDeposit(t) {
      this.selectedId = t.id;
      this.amountMode = 'setor';
      this.amountValue = '';
      this.amountDompetId = '';
      this.showAmountModal = true;
    },
    openWithdraw(t) {
      this.selectedId = t.id;
      this.amountMode = 'tarik';
      this.amountValue = '';
      this.amountDompetId = '';
      this.showAmountModal = true;
    },
    async simpan() {
      if (!this.form.nama || !this.form.target_jumlah) return this.showToast('Lengkapi field wajib', 'error');
      this.submitting = true;
      try {
        if (this.editId) {
          await api.put('/tabungan/' + this.editId, this.form);
        } else {
          await api.post('/tabungan', this.form);
        }
        this.showFormModal = false;
        this.showToast(this.editId ? 'Diperbarui!' : 'Ditambahkan!');
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal menyimpan', 'error');
      } finally {
        this.submitting = false;
      }
    },
    async submitAmount() {
      if (!this.amountValue || this.amountValue <= 0) return this.showToast('Masukkan jumlah valid', 'error');
      if (!this.amountDompetId) return this.showToast('Pilih dompet terlebih dahulu', 'error');
      this.submitting = true;
      try {
        await api.post(`/tabungan/${this.selectedId}/${this.amountMode}`, { jumlah: this.amountValue, dompet_id: this.amountDompetId });
        this.showAmountModal = false;
        this.showToast(this.amountMode === 'setor' ? 'Dana disetor!' : 'Dana ditarik!');
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal', 'error');
      } finally {
        this.submitting = false;
      }
    },
    async hapus(t) {
      this.deleteTarget = t;
      this.confirmMsg = `Hapus tabungan "${t.nama}"?`;
      this.showConfirm = true;
    },
    async doDelete() {
      if (!this.deleteTarget) return;
      try {
        await api.delete('/tabungan/' + this.deleteTarget.id);
        this.showToast('Dihapus!');
        this.load();
      } catch {
        this.showToast('Gagal', 'error');
      }
      this.deleteTarget = null;
    },
    formatRp(v) {
      return 'Rp ' + (Number(v) || 0).toLocaleString('id-ID');
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    showToast(msg, type = 'success') {
      this.toast = msg;
      this.toastType = type;
      setTimeout(() => { this.toast = ''; }, 3000);
    },
  },
  computed: {
    dompetOptions() {
      return this.dompetList.map(d => ({ value: d.id, label: d.nama }));
    },
  },
  async mounted() {
    this.load();
    try {
      this.dompetList = (await api.get('/dompet')).data;
    } catch { /* ignore */ }
  },
};
</script>

<style scoped>
.m-sav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.m-sav-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.m-sav-amounts {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.m-sav-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.m-sav-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.m-act-btns {
  display: flex;
  gap: 2px;
}
</style>
