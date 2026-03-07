<template>
  <div class="m-page">
    <!-- Transfer Form -->
    <div class="m-card">
      <h3 class="m-section-title" style="margin-top: 0;">🔄 Transfer Antar Dompet</h3>
      <div class="m-form-group">
        <label>Dari Dompet</label>
        <MobileSelect
          v-model="form.dari_dompet_id"
          :options="dariDompetOptions"
          label="Pilih Dompet Asal"
          placeholder="-- Pilih --"
        />
      </div>
      <div style="text-align: center; font-size: 20px; margin: 4px 0;">⬇️</div>
      <div class="m-form-group">
        <label>Ke Dompet</label>
        <MobileSelect
          v-model="form.ke_dompet_id"
          :options="keDompetOptions"
          label="Pilih Dompet Tujuan"
          placeholder="-- Pilih --"
        />
      </div>
      <div class="m-form-group">
        <label>Jumlah</label>
        <input type="number" v-model.number="form.jumlah" class="m-input" placeholder="0" inputmode="numeric" />
      </div>
      <div class="m-form-group">
        <label>Keterangan</label>
        <input v-model="form.keterangan" class="m-input" placeholder="Opsional" />
      </div>
      <button class="m-btn m-btn-primary m-btn-block" @click="transfer" :disabled="submitting">
        {{ submitting ? 'Memproses...' : '🔄 Transfer' }}
      </button>
    </div>

    <!-- History -->
    <h3 class="m-section-title">📋 Riwayat Transfer</h3>

    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="transfers.length === 0" class="m-empty">
      <p>Belum ada riwayat transfer</p>
    </div>

    <template v-else>
      <div v-for="t in transfers" :key="t.id" class="m-txn-item" style="cursor: default;">
        <div class="m-txn-icon">{{ t.tipe === 'pemasukan' ? '📥' : '📤' }}</div>
        <div class="m-txn-info">
          <div class="m-txn-desc">{{ t.dompet_ikon }} {{ t.dompet_nama }}</div>
          <div class="m-txn-meta">{{ t.keterangan || '-' }} · {{ formatDate(t.tanggal) }}</div>
        </div>
        <div class="m-txn-amount" :style="{ color: t.tipe === 'pemasukan' ? 'var(--accent-green)' : 'var(--accent-red)' }">
          {{ t.tipe === 'pemasukan' ? '+' : '-' }}{{ formatRp(t.jumlah) }}
        </div>
      </div>
    </template>

    <div v-if="toast" class="m-toast" :class="toastType">{{ toast }}</div>
  </div>
</template>

<script>
import api from '../../services/api';
import MobileSelect from '../components/MobileSelect.vue';

export default {
  name: 'MobileTransfer',
  components: { MobileSelect },
  data() {
    return {
      loading: true,
      dompetList: [],
      transfers: [],
      form: { dari_dompet_id: '', ke_dompet_id: '', jumlah: '', keterangan: '' },
      submitting: false,
      toast: '',
      toastType: 'success',
    };
  },
  computed: {
    dariDompetOptions() {
      return this.dompetList.map(d => ({
        value: d.id,
        label: `${d.ikon} ${d.nama} (${this.formatRp(d.saldo_saat_ini ?? d.saldo_awal)})`,
        disabled: d.id == this.form.ke_dompet_id,
      }));
    },
    keDompetOptions() {
      return this.dompetList.map(d => ({
        value: d.id,
        label: `${d.ikon} ${d.nama}`,
        disabled: d.id == this.form.dari_dompet_id,
      }));
    },
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const [dRes, tRes] = await Promise.all([api.get('/dompet'), api.get('/dompet/transfer/riwayat')]);
        this.dompetList = dRes.data;
        this.transfers = tRes.data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    async transfer() {
      if (!this.form.dari_dompet_id || !this.form.ke_dompet_id || !this.form.jumlah) {
        return this.showToast('Lengkapi semua field', 'error');
      }
      if (this.form.dari_dompet_id === this.form.ke_dompet_id) {
        return this.showToast('Dompet harus berbeda', 'error');
      }
      this.submitting = true;
      try {
        await api.post('/dompet/transfer', this.form);
        this.showToast('Transfer berhasil!');
        this.form = { dari_dompet_id: '', ke_dompet_id: '', jumlah: '', keterangan: '' };
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal transfer', 'error');
      } finally {
        this.submitting = false;
      }
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
  mounted() {
    this.load();
  },
};
</script>
