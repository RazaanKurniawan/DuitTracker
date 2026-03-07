<template>
  <div class="transfer-page fade-in">
    <div class="page-header">
      <h2>Transfer Antar Dompet</h2>
      <p>Pindahkan saldo dari satu dompet ke dompet lainnya</p>
    </div>

    <div class="form-card">
      <!-- Dompet Asal -->
      <div class="form-group">
        <label>Dari Dompet</label>
        <CustomSelect
          v-model="form.dari_dompet_id"
          :options="dompetOptions"
          placeholder="Pilih dompet asal"
        />
      </div>

      <!-- Arrow -->
      <div style="text-align: center; font-size: 28px; margin: 4px 0;">⬇️</div>

      <!-- Dompet Tujuan -->
      <div class="form-group">
        <label>Ke Dompet</label>
        <CustomSelect
          v-model="form.ke_dompet_id"
          :options="dompetTujuanOptions"
          placeholder="Pilih dompet tujuan"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Jumlah (Rp)</label>
          <input
            type="number"
            v-model.number="form.jumlah"
            class="form-control"
            placeholder="Contoh: 500000"
            min="1"
            required
          />
        </div>
        <div class="form-group">
          <label>Tanggal</label>
          <VueDatePicker
            v-model="form.tanggal"
            :enable-time-picker="false"
            auto-apply
            dark
            format="dd/MM/yyyy"
            placeholder="Pilih tanggal"
            :max-date="new Date()"
            input-class-name="dp-custom-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Keterangan (Opsional)</label>
        <input
          type="text"
          v-model="form.keterangan"
          class="form-control"
          placeholder="Contoh: Tarik tunai dari BCA"
        />
      </div>

      <!-- Preview -->
      <div v-if="form.jumlah > 0 && dariDompet && keDompet" class="preview-card">
        <div class="preview-title">Preview Transfer</div>
        <div class="preview-flow">
          <div class="preview-wallet">
            <span class="pw-icon">{{ dariDompet.ikon }}</span>
            <span class="pw-name">{{ dariDompet.nama }}</span>
            <span class="pw-amount out">- {{ formatRupiah(form.jumlah) }}</span>
          </div>
          <div class="preview-arrow">➡️</div>
          <div class="preview-wallet">
            <span class="pw-icon">{{ keDompet.ikon }}</span>
            <span class="pw-name">{{ keDompet.nama }}</span>
            <span class="pw-amount in">+ {{ formatRupiah(form.jumlah) }}</span>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" @click="doTransfer" :disabled="saving">
          {{ saving ? '⏳ Memproses...' : '🔄 Transfer Sekarang' }}
        </button>
      </div>
    </div>

    <!-- Riwayat Transfer -->
    <div class="riwayat-section" style="margin-top: 40px;">
      <h3 style="margin-bottom: 16px;">📋 Riwayat Transfer Terakhir</h3>

      <div v-if="loadingHistory" class="loading-spinner"><div class="spinner"></div></div>

      <div v-else-if="riwayat.length === 0" class="empty-state" style="padding: 30px;">
        <p>Belum ada riwayat transfer</p>
      </div>

      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Dompet</th>
              <th>Tipe</th>
              <th>Jumlah</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in riwayat" :key="t.id">
              <td>{{ formatTanggal(t.tanggal) }}</td>
              <td>{{ t.dompet_ikon }} {{ t.dompet_nama }}</td>
              <td>
                <span class="badge" :class="t.tipe">
                  {{ t.tipe === 'pemasukan' ? '📥 Masuk' : '📤 Keluar' }}
                </span>
              </td>
              <td :style="{ color: t.tipe === 'pemasukan' ? 'var(--accent-green)' : 'var(--accent-red)' }">
                {{ t.tipe === 'pemasukan' ? '+' : '-' }} {{ formatRupiah(t.jumlah) }}
              </td>
              <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ t.keterangan }}
              </td>
            </tr>
          </tbody>
        </table>
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
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

export default {
  name: 'TransferView',
  components: { CustomSelect, VueDatePicker },
  data() {
    return {
      saving: false,
      loadingHistory: true,
      dompetList: [],
      riwayat: [],
      form: {
        dari_dompet_id: null,
        ke_dompet_id: null,
        jumlah: null,
        keterangan: '',
        tanggal: new Date(),
      },
      toast: { show: false, message: '', type: 'success' },
    };
  },
  computed: {
    dompetOptions() {
      return this.dompetList.map(d => ({
        label: `${d.ikon} ${d.nama} — ${this.formatRupiah(d.saldo_saat_ini ?? d.saldo_awal)}`,
        value: d.id,
      }));
    },
    dompetTujuanOptions() {
      return this.dompetList
        .filter(d => d.id !== this.form.dari_dompet_id)
        .map(d => ({
          label: `${d.ikon} ${d.nama} — ${this.formatRupiah(d.saldo_saat_ini ?? d.saldo_awal)}`,
          value: d.id,
        }));
    },
    dariDompet() {
      return this.dompetList.find(d => d.id === this.form.dari_dompet_id);
    },
    keDompet() {
      return this.dompetList.find(d => d.id === this.form.ke_dompet_id);
    },
  },
  methods: {
    async loadDompet() {
      try {
        const { data } = await api.get('/dompet');
        this.dompetList = data;
      } catch (err) {
        console.error(err);
      }
    },
    async loadRiwayat() {
      this.loadingHistory = true;
      try {
        const { data } = await api.get('/dompet/transfer/riwayat');
        this.riwayat = data;
      } catch (err) {
        console.error(err);
      } finally {
        this.loadingHistory = false;
      }
    },
    formatDateForApi(date) {
      if (!date) return null;
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    async doTransfer() {
      if (!this.form.dari_dompet_id || !this.form.ke_dompet_id) {
        this.showToast('Pilih dompet asal dan tujuan!', 'error');
        return;
      }
      if (!this.form.jumlah || this.form.jumlah <= 0) {
        this.showToast('Jumlah transfer harus lebih dari 0!', 'error');
        return;
      }
      this.saving = true;
      try {
        await api.post('/dompet/transfer', {
          dari_dompet_id: this.form.dari_dompet_id,
          ke_dompet_id: this.form.ke_dompet_id,
          jumlah: this.form.jumlah,
          keterangan: this.form.keterangan,
          tanggal: this.formatDateForApi(this.form.tanggal),
        });
        this.showToast('Transfer berhasil!', 'success');
        this.form = { dari_dompet_id: null, ke_dompet_id: null, jumlah: null, keterangan: '', tanggal: new Date() };
        await Promise.all([this.loadDompet(), this.loadRiwayat()]);
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Transfer gagal', 'error');
      } finally {
        this.saving = false;
      }
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    formatTanggal(tgl) {
      return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
  mounted() {
    this.loadDompet();
    this.loadRiwayat();
  },
};
</script>

<style scoped>
.transfer-page {
  max-width: 700px;
  margin: 0 auto;
}

.preview-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-top: 16px;
}

.preview-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.preview-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.preview-wallet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px 12px;
}

.pw-icon {
  font-size: 28px;
}

.pw-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.pw-amount.out {
  color: var(--accent-red);
  font-weight: 700;
  font-size: 15px;
}

.pw-amount.in {
  color: var(--accent-green);
  font-weight: 700;
  font-size: 15px;
}

.preview-arrow {
  font-size: 24px;
}

.riwayat-section {
  max-width: 100%;
}

@media (max-width: 600px) {
  .preview-flow {
    flex-direction: column;
    gap: 8px;
  }
  .preview-arrow {
    transform: rotate(90deg);
  }
}
</style>
