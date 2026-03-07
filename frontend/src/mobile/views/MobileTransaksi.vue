<template>
  <div class="m-page">
    <!-- Search -->
    <div class="m-search">
      <span class="m-search-icon">🔍</span>
      <input v-model="search" placeholder="Cari transaksi..." @keydown.enter="applyFilter" />
    </div>

    <!-- Filter chips -->
    <div class="m-filter-row">
      <button class="m-chip" :class="{ active: filters.tipe === '' }" @click="filters.tipe = ''; applyFilter()">Semua</button>
      <button class="m-chip" :class="{ active: filters.tipe === 'pemasukan' }" @click="filters.tipe = 'pemasukan'; applyFilter()">📈 Masuk</button>
      <button class="m-chip" :class="{ active: filters.tipe === 'pengeluaran' }" @click="filters.tipe = 'pengeluaran'; applyFilter()">📉 Keluar</button>
    </div>

    <div v-if="loading" class="m-spinner"></div>

    <div v-else-if="transaksi.length === 0" class="m-empty">
      <div class="m-empty-icon">📭</div>
      <p>Belum ada transaksi</p>
    </div>

    <template v-else>
      <p class="m-result-count">{{ transaksi.length }} dari {{ total }} transaksi</p>

      <div v-for="t in transaksi" :key="t.id" class="m-txn-item" @click="editTransaksi(t.id)">
        <div class="m-txn-icon">{{ t.kategori_ikon || '💰' }}</div>
        <div class="m-txn-info">
          <div class="m-txn-desc">{{ t.keterangan || t.kategori_nama }}</div>
          <div class="m-txn-meta">{{ t.kategori_nama }} · {{ t.dompet_nama }} · {{ formatDate(t.tanggal) }}</div>
        </div>
        <div class="m-txn-right">
          <div class="m-txn-amount" :class="t.tipe">
            {{ t.tipe === 'pemasukan' ? '+' : '-' }}{{ formatRp(t.jumlah) }}
          </div>
          <button class="m-btn-icon" @click.stop="confirmDelete(t)" title="Hapus">🗑️</button>
        </div>
      </div>

      <!-- Load More -->
      <button v-if="hasMore" class="m-btn m-btn-secondary m-btn-block" @click="loadMore" style="margin-top: 8px;">
        Muat Lebih Banyak...
      </button>
    </template>

    <MobileConfirm v-model="showConfirm" :message="confirmMsg" @confirm="doDelete" />
    <div v-if="toast" class="m-toast" :class="toastType">{{ toast }}</div>
  </div>
</template>

<script>
import api from '../../services/api';
import MobileConfirm from '../components/MobileConfirm.vue';

export default {
  name: 'MobileTransaksi',
  components: { MobileConfirm },
  data() {
    return {
      loading: true,
      transaksi: [],
      search: '',
      filters: { tipe: '' },
      page: 1,
      total: 0,
      limit: 15,
      toast: '',
      toastType: 'success',
      showConfirm: false,
      confirmMsg: '',
      deleteTarget: null,
    };
  },
  computed: {
    hasMore() {
      return this.transaksi.length < this.total;
    },
  },
  methods: {
    async fetchTransaksi(append = false) {
      if (!append) this.loading = true;
      try {
        const params = { page: this.page, limit: this.limit };
        if (this.search) params.q = this.search;
        if (this.filters.tipe) params.tipe = this.filters.tipe;
        const res = await api.get('/transaksi', { params });
        if (append) {
          this.transaksi.push(...res.data.data);
        } else {
          this.transaksi = res.data.data;
        }
        this.total = res.data.total;
      } catch {
        this.showToast('Gagal memuat transaksi', 'error');
      } finally {
        this.loading = false;
      }
    },
    applyFilter() {
      this.page = 1;
      this.fetchTransaksi();
    },
    loadMore() {
      this.page++;
      this.fetchTransaksi(true);
    },
    editTransaksi(id) {
      this.$router.push('/transaksi/edit/' + id);
    },
    confirmDelete(t) {
      this.deleteTarget = t;
      this.confirmMsg = `Hapus transaksi "${t.keterangan || t.kategori_nama}"?`;
      this.showConfirm = true;
    },
    async doDelete() {
      if (!this.deleteTarget) return;
      const id = this.deleteTarget.id;
      try {
        await api.delete('/transaksi/' + id);
        this.transaksi = this.transaksi.filter(t => t.id !== id);
        this.total--;
        this.showToast('Transaksi dihapus');
      } catch {
        this.showToast('Gagal menghapus', 'error');
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
    if (this.$route.query.q) {
      this.search = this.$route.query.q;
    }
    this.fetchTransaksi();
  },
};
</script>

<style scoped>
.m-filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.m-result-count {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.m-txn-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
</style>
