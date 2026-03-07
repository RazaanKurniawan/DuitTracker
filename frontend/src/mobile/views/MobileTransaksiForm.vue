<template>
  <div class="m-page">
    <!-- Type toggle -->
    <div class="m-toggle-group">
      <button class="m-toggle-btn" :class="{ active: form.tipe === 'pemasukan' }" @click="form.tipe = 'pemasukan'; form.kategori_id = ''">📈 Pemasukan</button>
      <button class="m-toggle-btn" :class="{ active: form.tipe === 'pengeluaran' }" @click="form.tipe = 'pengeluaran'; form.kategori_id = ''">📉 Pengeluaran</button>
    </div>

    <!-- Form -->
    <div class="m-form-group">
      <label>Dompet / Rekening</label>
      <MobileSelect
        v-model="form.dompet_id"
        :options="dompetOptions"
        label="Pilih Dompet"
        placeholder="-- Pilih Dompet --"
      />
    </div>

    <div class="m-form-group">
      <label>Kategori</label>
      <MobileSelect
        v-model="form.kategori_id"
        :options="kategoriOptions"
        label="Pilih Kategori"
        placeholder="-- Pilih Kategori --"
      />
    </div>

    <div class="m-form-group">
      <label>Jumlah (Rp)</label>
      <input type="number" v-model.number="form.jumlah" class="m-input" placeholder="0" min="0" inputmode="numeric" />
    </div>

    <div class="m-form-group">
      <label>Tanggal</label>
      <input type="date" v-model="form.tanggal" class="m-input" />
    </div>

    <div class="m-form-group">
      <label>Keterangan</label>
      <input type="text" v-model="form.keterangan" class="m-input" placeholder="Contoh: Makan siang" />
    </div>

    <div class="m-form-group">
      <label>Foto (opsional)</label>
      <input type="file" accept="image/*" capture="environment" @change="onFileChange" class="m-input" />
      <img v-if="previewUrl" :src="previewUrl" class="m-preview-img" />
    </div>

    <button class="m-btn m-btn-primary m-btn-block" @click="submitForm" :disabled="submitting">
      {{ submitting ? 'Menyimpan...' : (isEdit ? '💾 Update' : '💾 Simpan') }}
    </button>

    <div v-if="toast" class="m-toast" :class="toastType">{{ toast }}</div>
  </div>
</template>

<script>
import api from '../../services/api';
import MobileSelect from '../components/MobileSelect.vue';

export default {
  name: 'MobileTransaksiForm',
  components: { MobileSelect },
  data() {
    return {
      isEdit: false,
      form: {
        tipe: 'pengeluaran',
        dompet_id: '',
        kategori_id: '',
        jumlah: '',
        tanggal: new Date().toISOString().slice(0, 10),
        keterangan: '',
        foto: null,
      },
      dompetList: [],
      kategoriList: [],
      submitting: false,
      previewUrl: '',
      toast: '',
      toastType: 'success',
    };
  },
  computed: {
    filteredKategori() {
      return this.kategoriList.filter(k => k.tipe === this.form.tipe);
    },
    dompetOptions() {
      return this.dompetList.map(d => ({ value: d.id, label: `${d.ikon} ${d.nama}` }));
    },
    kategoriOptions() {
      return this.filteredKategori.map(k => ({ value: k.id, label: `${k.ikon} ${k.nama}` }));
    },
  },
  methods: {
    async loadData() {
      try {
        const [dRes, kRes] = await Promise.all([api.get('/dompet'), api.get('/kategori')]);
        this.dompetList = dRes.data;
        this.kategoriList = kRes.data;

        if (this.$route.params.id) {
          this.isEdit = true;
          const res = await api.get('/transaksi/' + this.$route.params.id);
          const t = res.data;
          this.form = {
            tipe: t.jenis,
            dompet_id: t.dompet_id,
            kategori_id: t.kategori_id,
            jumlah: t.jumlah,
            tanggal: t.tanggal?.slice(0, 10),
            keterangan: t.keterangan,
            foto: null,
          };
          if (t.foto) {
            this.previewUrl = api.defaults.baseURL.replace('/api', '') + '/' + t.foto;
          }
        }
      } catch {
        this.showToast('Gagal memuat data', 'error');
      }
    },
    onFileChange(e) {
      const file = e.target.files[0];
      this.form.foto = file;
      if (file) {
        this.previewUrl = URL.createObjectURL(file);
      }
    },
    async submitForm() {
      if (!this.form.dompet_id || !this.form.kategori_id || !this.form.jumlah) {
        return this.showToast('Lengkapi semua field wajib', 'error');
      }
      this.submitting = true;
      try {
        const fd = new FormData();
        fd.append('tipe', this.form.tipe);
        fd.append('dompet_id', this.form.dompet_id);
        fd.append('kategori_id', this.form.kategori_id);
        fd.append('jumlah', this.form.jumlah);
        fd.append('tanggal', this.form.tanggal);
        fd.append('keterangan', this.form.keterangan);
        if (this.form.foto) fd.append('foto', this.form.foto);

        if (this.isEdit) {
          await api.put('/transaksi/' + this.$route.params.id, fd);
          this.showToast('Transaksi diperbarui!');
        } else {
          await api.post('/transaksi', fd);
          this.showToast('Transaksi disimpan!');
        }
        setTimeout(() => this.$router.push('/transaksi'), 1000);
      } catch (err) {
        this.showToast(err.response?.data?.error || 'Gagal menyimpan', 'error');
      } finally {
        this.submitting = false;
      }
    },
    showToast(msg, type = 'success') {
      this.toast = msg;
      this.toastType = type;
      setTimeout(() => { this.toast = ''; }, 3000);
    },
  },
  mounted() {
    this.loadData();
  },
};
</script>

<style scoped>
.m-preview-img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-top: 8px;
}
</style>
