import { createRouter, createWebHistory } from 'vue-router';
import auth from '../store/auth';

import DashboardView from '../views/DashboardView.vue';
import TransaksiListView from '../views/TransaksiListView.vue';
import TransaksiFormView from '../views/TransaksiFormView.vue';
import KategoriView from '../views/KategoriView.vue';
import DompetView from '../views/DompetView.vue';
import TagihanRutinView from '../views/TagihanRutinView.vue';
import AnggaranView from '../views/AnggaranView.vue';
import LaporanView from '../views/LaporanView.vue';
import TransferView from '../views/TransferView.vue';
import TabunganView from '../views/TabunganView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';

const routes = [
  { path: '/login', name: 'Login', component: LoginView, meta: { guest: true } },
  { path: '/register', name: 'Register', component: RegisterView, meta: { guest: true } },
  {
    path: '/', name: 'Dashboard',
    components: {
      desktop: DashboardView,
      mobile: () => import('../mobile/views/MobileDashboard.vue'),
    },
  },
  {
    path: '/transaksi', name: 'Transaksi',
    components: {
      desktop: TransaksiListView,
      mobile: () => import('../mobile/views/MobileTransaksi.vue'),
    },
  },
  {
    path: '/transaksi/tambah', name: 'TambahTransaksi',
    components: {
      desktop: TransaksiFormView,
      mobile: () => import('../mobile/views/MobileTransaksiForm.vue'),
    },
  },
  {
    path: '/transaksi/edit/:id', name: 'EditTransaksi',
    components: {
      desktop: TransaksiFormView,
      mobile: () => import('../mobile/views/MobileTransaksiForm.vue'),
    },
  },
  {
    path: '/kategori', name: 'Kategori',
    components: {
      desktop: KategoriView,
      mobile: () => import('../mobile/views/MobileKategori.vue'),
    },
  },
  {
    path: '/dompet', name: 'Dompet',
    components: {
      desktop: DompetView,
      mobile: () => import('../mobile/views/MobileDompet.vue'),
    },
  },
  {
    path: '/tagihan-rutin', name: 'TagihanRutin',
    components: {
      desktop: TagihanRutinView,
      mobile: () => import('../mobile/views/MobileTagihan.vue'),
    },
  },
  {
    path: '/anggaran', name: 'Anggaran',
    components: {
      desktop: AnggaranView,
      mobile: () => import('../mobile/views/MobileAnggaran.vue'),
    },
  },
  {
    path: '/transfer', name: 'Transfer',
    components: {
      desktop: TransferView,
      mobile: () => import('../mobile/views/MobileTransfer.vue'),
    },
  },
  {
    path: '/tabungan', name: 'Tabungan',
    components: {
      desktop: TabunganView,
      mobile: () => import('../mobile/views/MobileTabungan.vue'),
    },
  },
  {
    path: '/laporan', name: 'Laporan',
    components: {
      desktop: LaporanView,
      mobile: () => import('../mobile/views/MobileLaporan.vue'),
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  if (!to.meta.guest && !auth.isLoggedIn()) {
    next('/login');
  } else {
    next();
  }
});

export default router;
