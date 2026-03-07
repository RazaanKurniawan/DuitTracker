<template>
  <div class="m-page">
    <div class="m-toggle-group">
      <button class="m-toggle-btn" :class="{ active: tab === 'pengeluaran' }" @click="tab = 'pengeluaran'">📉 Pengeluaran</button>
      <button class="m-toggle-btn" :class="{ active: tab === 'pemasukan' }" @click="tab = 'pemasukan'">📈 Pemasukan</button>
    </div>

    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="filtered.length === 0" class="m-empty">
      <div class="m-empty-icon">🏷️</div>
      <p>Belum ada kategori {{ tab }}</p>
    </div>

    <template v-else>
      <div v-for="k in filtered" :key="k.id" class="m-list-item">
        <span class="m-kat-icon">{{ k.ikon || '📦' }}</span>
        <span class="m-kat-name">{{ k.nama }}</span>
        <div class="m-kat-actions">
          <button @click="openEdit(k)" class="m-btn-icon">✏️</button>
          <button @click="hapus(k)" class="m-btn-icon">🗑️</button>
        </div>
      </div>
    </template>

    <button class="m-fab" @click="openAdd">➕</button>

    <!-- Modal -->
    <MobileModal v-model="showModal" :title="editId ? 'Edit Kategori' : 'Tambah Kategori'">
      <div class="m-form-group">
        <label>Ikon</label>
        <input v-model="formIkon" class="m-input" placeholder="Contoh: 🍔" />
      </div>
      <div class="m-form-group">
        <label>Nama Kategori</label>
        <input v-model="formNama" class="m-input" placeholder="Nama kategori" />
      </div>
      <div class="m-form-group">
        <label>Tipe</label>
        <MobileSelect
          v-model="formTipe"
          :options="tipeOptions"
          label="Pilih Tipe"
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
  name: 'MobileKategori',
  components: { MobileModal, MobileSelect, MobileConfirm },
  data() {
    return {
      loading: true,
      kategoriList: [],
      tab: 'pengeluaran',
      showModal: false,
      editId: null,
      formIkon: '',
      formNama: '',
      formTipe: 'pengeluaran',
      submitting: false,
      toast: '',
      toastType: 'success',
      showConfirm: false,
      confirmMsg: '',
      deleteTarget: null,
      tipeOptions: [
        { value: 'pengeluaran', label: 'Pengeluaran' },
        { value: 'pemasukan', label: 'Pemasukan' },
      ],
    };
  },
  computed: {
    filtered() {
      return this.kategoriList.filter(k => k.tipe === this.tab);
    },
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        this.kategoriList = (await api.get('/kategori')).data;
      } catch {
        this.showToast('Gagal memuat', 'error');
      } finally {
        this.loading = false;
      }
    },
    openAdd() {
      this.editId = null;
      this.formIkon = '';
      this.formNama = '';
      this.formTipe = this.tab;
      this.showModal = true;
    },
    openEdit(k) {
      this.editId = k.id;
      this.formIkon = k.ikon;
      this.formNama = k.nama;
      this.formTipe = k.tipe;
      this.showModal = true;
    },
    async simpan() {
      if (!this.formNama.trim()) return this.showToast('Nama wajib diisi', 'error');
      this.submitting = true;
      try {
        const data = { ikon: this.formIkon, nama: this.formNama, tipe: this.formTipe };
        if (this.editId) {
          await api.put('/kategori/' + this.editId, data);
        } else {
          await api.post('/kategori', data);
        }
        this.showModal = false;
        this.showToast(this.editId ? 'Kategori diperbarui!' : 'Kategori ditambahkan!');
        this.load();
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal menyimpan', 'error');
      } finally {
        this.submitting = false;
      }
    },
    async hapus(k) {
      this.deleteTarget = k;
      this.confirmMsg = `Hapus kategori "${k.nama}"?`;
      this.showConfirm = true;
    },
    async doDelete() {
      if (!this.deleteTarget) return;
      try {
        await api.delete('/kategori/' + this.deleteTarget.id);
        this.showToast('Dihapus!');
        this.load();
      } catch {
        this.showToast('Gagal menghapus', 'error');
      }
      this.deleteTarget = null;
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
.m-kat-icon {
  font-size: 24px;
}
.m-kat-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}
.m-kat-actions {
  display: flex;
  gap: 2px;
}
</style>
