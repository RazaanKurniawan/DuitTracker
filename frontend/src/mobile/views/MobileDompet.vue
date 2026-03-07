<template>
  <div class="m-page">
    <!-- Total balance -->
    <div class="m-card" style="text-align: center; margin-bottom: 20px;">
      <div class="m-stat-label">Total Saldo</div>
      <div class="m-stat-value" style="font-size: 24px;">{{ formatRp(totalSaldo) }}</div>
    </div>

    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="dompetList.length === 0" class="m-empty">
      <div class="m-empty-icon">👛</div>
      <p>Belum ada dompet</p>
    </div>

    <template v-else>
      <div v-for="d in dompetList" :key="d.id" class="m-wallet-card" :style="{ borderLeftColor: d.warna || 'var(--accent-blue)' }">
        <div class="m-wallet-header">
          <span class="m-wallet-icon">{{ d.ikon || '👛' }}</span>
          <span class="m-wallet-name">{{ d.nama }}</span>
          <div class="m-wallet-actions">
            <button @click="openEdit(d)" class="m-btn-icon">✏️</button>
            <button @click="hapus(d)" class="m-btn-icon">🗑️</button>
          </div>
        </div>
        <div class="m-wallet-balance">{{ formatRp(d.saldo_saat_ini ?? d.saldo_awal) }}</div>
        <div class="m-wallet-meta">{{ d.mata_uang || 'IDR' }}</div>
      </div>
    </template>

    <button class="m-fab" @click="openAdd">➕</button>

    <MobileModal v-model="showModal" :title="editId ? 'Edit Dompet' : 'Tambah Dompet'">
      <div class="m-form-group">
        <label>Ikon</label>
        <input v-model="form.ikon" class="m-input" placeholder="👛" />
      </div>
      <div class="m-form-group">
        <label>Nama</label>
        <input v-model="form.nama" class="m-input" placeholder="Nama dompet" />
      </div>
      <div class="m-form-group">
        <label>Saldo Awal</label>
        <input type="number" v-model.number="form.saldo_awal" class="m-input" placeholder="0" inputmode="numeric" />
      </div>
      <div class="m-form-group">
        <label>Warna</label>
        <input type="color" v-model="form.warna" class="m-input" style="height: 44px; padding: 4px;" />
      </div>
      <div class="m-form-group">
        <label>Mata Uang</label>
        <MobileSelect
          v-model="form.mata_uang"
          :options="currencyOptions"
          label="Pilih Mata Uang"
        />
      </div>
      <button class="m-btn m-btn-primary m-btn-block" @click="simpan" :disabled="submitting">
        {{ submitting ? 'Menyimpan...' : '💾 Simpan' }}
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
  name: 'MobileDompet',
  components: { MobileModal, MobileSelect, MobileConfirm },
  data() {
    return {
      loading: true,
      dompetList: [],
      showModal: false,
      editId: null,
      form: { ikon: '👛', nama: '', saldo_awal: 0, warna: '#4361ee', mata_uang: 'IDR' },
      currencies: ['IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AUD', 'CNY'],
      submitting: false,
      toast: '',
      toastType: 'success',
      showConfirm: false,
      confirmMsg: '',
      deleteTarget: null,
    };
  },
  computed: {
    totalSaldo() {
      return this.dompetList.reduce((s, d) => s + parseFloat(d.saldo_saat_ini || d.saldo_awal || 0), 0);
    },
    currencyOptions() {
      return this.currencies.map(c => ({ value: c, label: c }));
    },
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        this.dompetList = (await api.get('/dompet')).data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    openAdd() {
      this.editId = null;
      this.form = { ikon: '👛', nama: '', saldo_awal: 0, warna: '#4361ee', mata_uang: 'IDR' };
      this.showModal = true;
    },
    openEdit(d) {
      this.editId = d.id;
      this.form = { ikon: d.ikon, nama: d.nama, saldo_awal: d.saldo_awal, warna: d.warna || '#4361ee', mata_uang: d.mata_uang || 'IDR' };
      this.showModal = true;
    },
    async simpan() {
      if (!this.form.nama.trim()) return this.showToast('Nama wajib diisi', 'error');
      this.submitting = true;
      try {
        if (this.editId) {
          await api.put('/dompet/' + this.editId, this.form);
        } else {
          await api.post('/dompet', this.form);
        }
        this.showModal = false;
        this.showToast(this.editId ? 'Dompet diperbarui!' : 'Dompet ditambahkan!');
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal menyimpan', 'error');
      } finally {
        this.submitting = false;
      }
    },
    async hapus(d) {
      this.deleteTarget = d;
      this.confirmMsg = `Hapus dompet "${d.nama}"?`;
      this.showConfirm = true;
    },
    async doDelete() {
      if (!this.deleteTarget) return;
      try {
        await api.delete('/dompet/' + this.deleteTarget.id);
        this.showToast('Dihapus!');
        this.load();
      } catch {
        this.showToast('Gagal menghapus', 'error');
      }
      this.deleteTarget = null;
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
    this.load();
  },
};
</script>

<style scoped>
.m-wallet-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-left: 4px solid;
}
.m-wallet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.m-wallet-icon {
  font-size: 24px;
}
.m-wallet-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.m-wallet-actions {
  display: flex;
  gap: 2px;
}
.m-wallet-balance {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.m-wallet-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>
