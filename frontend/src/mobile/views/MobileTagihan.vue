<template>
  <div class="m-page">
    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="tagihanList.length === 0" class="m-empty">
      <div class="m-empty-icon">🔁</div>
      <p>Belum ada tagihan rutin</p>
    </div>

    <template v-else>
      <div v-for="t in tagihanList" :key="t.id" class="m-card">
        <div class="m-tag-header">
          <div class="m-tag-left">
            <span class="m-tag-icon">{{ t.kategori_ikon || '📄' }}</span>
            <div>
              <div class="m-tag-name">{{ t.keterangan || t.kategori_nama }}</div>
              <div class="m-tag-meta">{{ t.dompet_ikon }} {{ t.dompet_nama }} · {{ t.frekuensi }}</div>
            </div>
          </div>
          <label class="m-switch">
            <input type="checkbox" :checked="t.is_active" @change="toggleActive(t)" />
            <span class="m-switch-slider"></span>
          </label>
        </div>
        <div class="m-tag-footer">
          <span class="m-txn-amount" :class="t.tipe">
            {{ t.tipe === 'pemasukan' ? '+' : '-' }}{{ formatRp(t.jumlah) }}
          </span>
          <span class="m-tag-next">Berikutnya: {{ formatDate(t.tanggal_berikutnya) }}</span>
        </div>
        <div class="m-tag-actions">
          <button @click="openEdit(t)" class="m-btn-icon">✏️</button>
          <button @click="hapus(t)" class="m-btn-icon">🗑️</button>
        </div>
      </div>
    </template>

    <button class="m-fab" @click="openAdd">➕</button>

    <MobileModal v-model="showModal" :title="editId ? 'Edit Tagihan' : 'Tambah Tagihan'">
      <div class="m-form-group">
        <label>Tipe</label>
        <MobileSelect
          v-model="form.tipe"
          :options="tipeOptions"
          label="Pilih Tipe"
          @update:modelValue="form.kategori_id = ''"
        />
      </div>
      <div class="m-form-group">
        <label>Kategori</label>
        <MobileSelect
          v-model="form.kategori_id"
          :options="kategoriOptions"
          label="Pilih Kategori"
          placeholder="-- Pilih --"
        />
      </div>
      <div class="m-form-group">
        <label>Dompet</label>
        <MobileSelect
          v-model="form.dompet_id"
          :options="dompetOptions"
          label="Pilih Dompet"
          placeholder="-- Pilih --"
        />
      </div>
      <div class="m-form-group">
        <label>Jumlah</label>
        <input type="number" v-model.number="form.jumlah" class="m-input" placeholder="0" inputmode="numeric" />
      </div>
      <div class="m-form-group">
        <label>Frekuensi</label>
        <MobileSelect
          v-model="form.frekuensi"
          :options="frekuensiOptions"
          label="Pilih Frekuensi"
        />
      </div>
      <div class="m-form-group">
        <label>Tanggal Berikutnya</label>
        <input type="date" v-model="form.tanggal_berikutnya" class="m-input" />
      </div>
      <div class="m-form-group">
        <label>Keterangan</label>
        <input v-model="form.keterangan" class="m-input" placeholder="Opsional" />
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
  name: 'MobileTagihan',
  components: { MobileModal, MobileSelect, MobileConfirm },
  data() {
    return {
      loading: true,
      tagihanList: [],
      kategoriList: [],
      dompetList: [],
      showModal: false,
      editId: null,
      form: {
        tipe: 'pengeluaran',
        kategori_id: '',
        dompet_id: '',
        jumlah: '',
        frekuensi: 'bulanan',
        tanggal_berikutnya: '',
        keterangan: '',
      },
      submitting: false,
      toast: '',
      toastType: 'success',
      showConfirm: false,
      confirmMsg: '',
      deleteTarget: null,
    };
  },
  computed: {
    filteredKategori() {
      return this.kategoriList.filter(k => k.tipe === this.form.tipe);
    },
    tipeOptions() {
      return [
        { value: 'pengeluaran', label: 'Pengeluaran' },
        { value: 'pemasukan', label: 'Pemasukan' },
      ];
    },
    kategoriOptions() {
      return this.filteredKategori.map(k => ({ value: k.id, label: `${k.ikon} ${k.nama}` }));
    },
    dompetOptions() {
      return this.dompetList.map(d => ({ value: d.id, label: `${d.ikon} ${d.nama}` }));
    },
    frekuensiOptions() {
      return [
        { value: 'harian', label: 'Harian' },
        { value: 'mingguan', label: 'Mingguan' },
        { value: 'bulanan', label: 'Bulanan' },
        { value: 'tahunan', label: 'Tahunan' },
      ];
    },
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const [tRes, kRes, dRes] = await Promise.all([
          api.get('/transaksi-berulang'),
          api.get('/kategori'),
          api.get('/dompet'),
        ]);
        this.tagihanList = tRes.data;
        this.kategoriList = kRes.data;
        this.dompetList = dRes.data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    async toggleActive(t) {
      try {
        await api.put('/transaksi-berulang/' + t.id, { ...t, is_active: !t.is_active });
        t.is_active = !t.is_active;
      } catch {
        this.showToast('Gagal update status', 'error');
      }
    },
    openAdd() {
      this.editId = null;
      this.form = {
        tipe: 'pengeluaran',
        kategori_id: '',
        dompet_id: '',
        jumlah: '',
        frekuensi: 'bulanan',
        tanggal_berikutnya: new Date().toISOString().slice(0, 10),
        keterangan: '',
      };
      this.showModal = true;
    },
    openEdit(t) {
      this.editId = t.id;
      this.form = {
        tipe: t.tipe,
        kategori_id: t.kategori_id,
        dompet_id: t.dompet_id,
        jumlah: t.jumlah,
        frekuensi: t.frekuensi,
        tanggal_berikutnya: t.tanggal_berikutnya?.slice(0, 10) || '',
        keterangan: t.keterangan || '',
      };
      this.showModal = true;
    },
    async simpan() {
      if (!this.form.kategori_id || !this.form.dompet_id || !this.form.jumlah) {
        return this.showToast('Lengkapi field wajib', 'error');
      }
      this.submitting = true;
      try {
        if (this.editId) {
          await api.put('/transaksi-berulang/' + this.editId, this.form);
        } else {
          await api.post('/transaksi-berulang', this.form);
        }
        this.showModal = false;
        this.showToast(this.editId ? 'Diperbarui!' : 'Ditambahkan!');
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal', 'error');
      } finally {
        this.submitting = false;
      }
    },
    async hapus(t) {
      this.deleteTarget = t;
      this.confirmMsg = 'Hapus tagihan ini?';
      this.showConfirm = true;
    },
    async doDelete() {
      if (!this.deleteTarget) return;
      try {
        await api.delete('/transaksi-berulang/' + this.deleteTarget.id);
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
  mounted() {
    this.load();
  },
};
</script>

<style scoped>
.m-tag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.m-tag-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.m-tag-icon {
  font-size: 24px;
}
.m-tag-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.m-tag-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.m-tag-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.m-tag-next {
  font-size: 12px;
  color: var(--text-secondary);
}
.m-tag-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}
/* Switch toggle */
.m-switch {
  position: relative;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}
.m-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.m-switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-input);
  border-radius: 26px;
  transition: 0.3s;
  border: 1px solid var(--border-color);
}
.m-switch-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}
.m-switch input:checked + .m-switch-slider {
  background: var(--accent-green);
  border-color: var(--accent-green);
}
.m-switch input:checked + .m-switch-slider::before {
  transform: translateX(22px);
}
</style>
