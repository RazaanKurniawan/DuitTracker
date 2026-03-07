<template>
  <div class="transaksi-form-page fade-in">
    <div class="page-header">
      <h2>{{ isEdit ? 'Edit Transaksi' : 'Tambah Transaksi Baru' }}</h2>
      <p>{{ isEdit ? 'Ubah detail transaksi' : 'Catat pemasukan atau pengeluaranmu' }}</p>
    </div>

    <div class="form-card">
      <div class="form-group">
        <label>Tipe Transaksi</label>
        <div style="display: flex; gap: 12px;">
          <button
            class="btn"
            :class="form.tipe === 'pemasukan' ? 'btn-primary' : 'btn-secondary'"
            @click="form.tipe = 'pemasukan'; loadKategori()"
            type="button"
          >📈 Pemasukan</button>
          <button
            class="btn"
            :class="form.tipe === 'pengeluaran' ? 'btn-primary' : 'btn-secondary'"
            @click="form.tipe = 'pengeluaran'; loadKategori()"
            type="button"
          >📉 Pengeluaran</button>
        </div>
      </div>

      <div class="form-group">
        <label>Dompet / Rekening</label>
        <CustomSelect 
          v-model="form.dompet_id"
          :options="dompetList.map(d => ({ label: `${d.ikon} ${d.nama} - ${formatRupiah(d.saldo_saat_ini !== undefined ? d.saldo_saat_ini : d.saldo_awal)}`, value: d.id }))"
          placeholder="Pilih Dompet"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Kategori</label>
          <CustomSelect 
            v-model="form.kategori_id"
            :options="filteredKategori.map(k => ({ label: `${k.ikon} ${k.nama}`, value: k.id }))"
            placeholder="Pilih Kategori"
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

<!-- Skipping down to imports -->
<!-- ... -->
      <div class="form-group">
        <label>Jumlah (Rp)</label>
        <input
          type="number"
          v-model.number="form.jumlah"
          class="form-control"
          placeholder="Contoh: 150000"
          min="0"
          required
        />
      </div>

      <div class="form-group">
        <label>Keterangan</label>
        <input
          type="text"
          v-model="form.keterangan"
          class="form-control"
          placeholder="Contoh: Makan siang di warteg"
        />
      </div>

      <!-- Foto Struk -->
      <div class="form-group">
        <label>📷 Foto Struk (Opsional)</label>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <label class="btn btn-secondary" style="cursor: pointer; font-size: 13px;">
            📂 Pilih Foto
            <input type="file" accept="image/*" @change="onFotoSelected" style="display: none;" ref="fotoInput" />
          </label>
          <span v-if="fotoFile" style="font-size: 13px; color: var(--text-secondary);">{{ fotoFile.name }}</span>
        </div>
        <div v-if="fotoPreview || form.foto" style="margin-top: 12px;">
          <img :src="fotoPreview || apiBase + form.foto" alt="Foto struk" style="max-width: 200px; max-height: 200px; border-radius: var(--radius-md); border: 1px solid var(--border-color);" />
          <button v-if="form.foto && !fotoFile" class="btn btn-secondary" style="margin-left: 12px; font-size: 12px;" @click="hapusFoto">🗑️ Hapus Foto</button>
        </div>
      </div>

      <!-- Preview -->
      <div v-if="form.jumlah > 0" class="stat-card" :class="form.tipe" style="margin-top: 16px;">
        <div class="stat-label">Preview</div>
        <div class="stat-value">
          {{ form.tipe === 'pemasukan' ? '+' : '-' }} {{ formatRupiah(form.jumlah) }}
        </div>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" @click="simpan" :disabled="saving">
          {{ saving ? '⏳ Menyimpan...' : (isEdit ? '💾 Update' : '💾 Simpan') }}
        </button>
        <router-link to="/transaksi" class="btn btn-secondary">← Kembali</router-link>
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
  name: 'TransaksiFormView',
  components: { VueDatePicker, CustomSelect },
  data() {
    return {
      isEdit: false,
      saving: false,
      kategoriList: [],
      dompetList: [],
      form: {
        dompet_id: null,
        tipe: 'pengeluaran',
        kategori_id: null,
        jumlah: null,
        keterangan: '',
        tanggal: new Date(),
        foto: null,
      },
      fotoFile: null,
      fotoPreview: null,
      apiBase: api.defaults.baseURL.replace('/api', ''),
      toast: { show: false, message: '', type: 'success' },
    };
  },
  computed: {
    filteredKategori() {
      return this.kategoriList.filter(k => k.tipe === this.form.tipe);
    },
  },
  methods: {
    async loadKategori() {
      try {
        const { data } = await api.get('/kategori');
        this.kategoriList = data;
      } catch (err) {
        console.error('Error loading kategori:', err);
      }
    },
    async loadDompet() {
      try {
        const { data } = await api.get('/dompet');
        this.dompetList = data;
        // Auto select first dompet if creating new and dompet_id is null
        if (!this.isEdit && !this.form.dompet_id && data.length > 0) {
          this.form.dompet_id = data[0].id;
        }
      } catch (err) {
        console.error('Error loading dompet:', err);
      }
    },
    async loadTransaksi(id) {
      try {
        const { data } = await api.get(`/transaksi/${id}`);
        this.form = {
          dompet_id: data.dompet_id,
          tipe: data.tipe,
          kategori_id: data.kategori_id,
          jumlah: parseFloat(data.jumlah),
          keterangan: data.keterangan || '',
          tanggal: data.tanggal ? new Date(data.tanggal) : new Date(),
          foto: data.foto || null,
        };
      } catch (err) {
        console.error('Error loading transaksi:', err);
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
    async simpan() {
      if (!this.form.dompet_id || !this.form.kategori_id || !this.form.jumlah || !this.form.tanggal) {
        this.showToast('Mohon isi semua field yang wajib!', 'error');
        return;
      }
      this.saving = true;
      const payload = {
        ...this.form,
        tanggal: this.formatDateForApi(this.form.tanggal),
      };
      try {
        let transaksiId;
        if (this.isEdit) {
          transaksiId = this.$route.params.id;
          await api.put(`/transaksi/${transaksiId}`, payload);
        } else {
          const { data: created } = await api.post('/transaksi', payload);
          transaksiId = created.id;
        }
        // Upload foto if selected
        if (this.fotoFile && transaksiId) {
          await this.uploadFoto(transaksiId);
        }
        this.showToast(this.isEdit ? 'Transaksi berhasil diupdate!' : 'Transaksi berhasil disimpan!', 'success');
        setTimeout(() => this.$router.push('/transaksi'), 1000);
      } catch (err) {
        this.showToast('Gagal menyimpan transaksi', 'error');
      } finally {
        this.saving = false;
      }
    },
    formatRupiah(val) {
      return 'Rp ' + Number(val).toLocaleString('id-ID');
    },
    onFotoSelected(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.fotoFile = file;
      this.fotoPreview = URL.createObjectURL(file);
    },
    async uploadFoto(transaksiId) {
      const fd = new FormData();
      fd.append('foto', this.fotoFile);
      await api.post(`/transaksi/${transaksiId}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    async hapusFoto() {
      if (!this.isEdit) return;
      try {
        await api.delete(`/transaksi/${this.$route.params.id}/foto`);
        this.form.foto = null;
        this.showToast('Foto berhasil dihapus', 'success');
      } catch (err) {
        this.showToast('Gagal menghapus foto', 'error');
      }
    },
    showToast(message, type) {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
  async mounted() {
    await Promise.all([this.loadKategori(), this.loadDompet()]);
    if (this.$route.params.id) {
      this.isEdit = true;
      await this.loadTransaksi(this.$route.params.id);
    }
  },
};
</script>
