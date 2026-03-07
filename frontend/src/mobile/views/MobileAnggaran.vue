<template>
  <div class="m-page">
    <!-- Month selector -->
    <MobileMonthPicker v-model:month="bulan" v-model:year="tahun" @change="load" />

    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="anggaranList.length === 0" class="m-empty">
      <div class="m-empty-icon">🎯</div>
      <p>Belum ada target anggaran</p>
    </div>

    <template v-else>
      <div v-for="a in anggaranList" :key="a.id" class="m-card">
        <div class="m-budget-header">
          <span>{{ a.kategori_ikon || '📦' }} {{ a.kategori_nama }}</span>
          <div class="m-act-btns">
            <button @click="openEdit(a)" class="m-btn-icon">✏️</button>
            <button @click="hapus(a)" class="m-btn-icon">🗑️</button>
          </div>
        </div>
        <div class="m-budget-amounts">
          <span :class="statusClass(a)">{{ formatRp(a.total_pengeluaran) }}</span>
          <span class="m-budget-sep">dari</span>
          <span>{{ formatRp(a.batas) }}</span>
        </div>
        <div class="m-progress">
          <div class="m-progress-bar" :style="{ width: persen(a) + '%', background: statusColor(a) }"></div>
        </div>
        <div class="m-budget-persen" :class="statusClass(a)">{{ persen(a) }}%</div>
      </div>
    </template>

    <button class="m-fab" @click="openAdd">➕</button>

    <MobileModal v-model="showModal" :title="editId ? 'Edit Anggaran' : 'Tambah Anggaran'">
      <div class="m-form-group">
        <label>Kategori Pengeluaran</label>
        <MobileSelect
          v-model="form.kategori_id"
          :options="kategoriOptions"
          label="Pilih Kategori"
          placeholder="-- Pilih --"
        />
      </div>
      <div class="m-form-group">
        <label>Batas Anggaran (Rp)</label>
        <input type="number" v-model.number="form.batas" class="m-input" placeholder="0" inputmode="numeric" />
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
import MobileMonthPicker from '../components/MobileMonthPicker.vue';
import MobileSelect from '../components/MobileSelect.vue';
import MobileConfirm from '../components/MobileConfirm.vue';

const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default {
  name: 'MobileAnggaran',
  components: { MobileModal, MobileMonthPicker, MobileSelect, MobileConfirm },
  data() {
    const now = new Date();
    return {
      loading: true,
      bulan: now.getMonth() + 1,
      tahun: now.getFullYear(),
      anggaranList: [],
      kategoriList: [],
      showModal: false,
      editId: null,
      form: { kategori_id: '', batas: '' },
      submitting: false,
      toast: '',
      toastType: 'success',
      showConfirm: false,
      confirmMsg: '',
      deleteTarget: null,
    };
  },
  computed: {
    monthLabel() {
      return bulanNames[this.bulan - 1] + ' ' + this.tahun;
    },
    kategoriPengeluaran() {
      return this.kategoriList.filter(k => k.tipe === 'pengeluaran');
    },
    kategoriOptions() {
      return this.kategoriPengeluaran.map(k => ({ value: k.id, label: `${k.ikon} ${k.nama}` }));
    },
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const [aRes, kRes] = await Promise.all([
          api.get('/anggaran', { params: { bulan: this.bulan, tahun: this.tahun } }),
          api.get('/kategori'),
        ]);
        this.anggaranList = aRes.data;
        this.kategoriList = kRes.data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    persen(a) {
      return Math.min(100, Math.round((a.total_pengeluaran / a.batas) * 100));
    },
    statusColor(a) {
      const p = this.persen(a);
      if (p >= 100) return 'var(--accent-red)';
      if (p >= 80) return 'var(--accent-orange)';
      return 'var(--accent-green)';
    },
    statusClass(a) {
      const p = this.persen(a);
      if (p >= 100) return 'danger';
      if (p >= 80) return 'warning';
      return 'safe';
    },
    openAdd() {
      this.editId = null;
      this.form = { kategori_id: '', batas: '' };
      this.showModal = true;
    },
    openEdit(a) {
      this.editId = a.id;
      this.form = { kategori_id: a.kategori_id, batas: a.batas };
      this.showModal = true;
    },
    async simpan() {
      if (!this.form.kategori_id || !this.form.batas) return this.showToast('Lengkapi semua field', 'error');
      this.submitting = true;
      try {
        const data = { ...this.form, bulan: this.bulan, tahun: this.tahun };
        if (this.editId) {
          await api.put('/anggaran/' + this.editId, data);
        } else {
          await api.post('/anggaran', data);
        }
        this.showModal = false;
        this.showToast(this.editId ? 'Diperbarui!' : 'Ditambahkan!');
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal menyimpan', 'error');
      } finally {
        this.submitting = false;
      }
    },
    async hapus(a) {
      this.deleteTarget = a;
      this.confirmMsg = 'Hapus anggaran ini?';
      this.showConfirm = true;
    },
    async doDelete() {
      if (!this.deleteTarget) return;
      try {
        await api.delete('/anggaran/' + this.deleteTarget.id);
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
.m-budget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.m-act-btns {
  display: flex;
  gap: 2px;
}
.m-budget-amounts {
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.m-budget-sep {
  font-size: 12px;
}
.m-budget-persen {
  font-size: 13px;
  font-weight: 600;
  margin-top: 6px;
  text-align: right;
}
.danger { color: var(--accent-red); }
.warning { color: var(--accent-orange); }
.safe { color: var(--accent-green); }
</style>
