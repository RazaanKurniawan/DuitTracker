<template>
  <!-- Auth pages (login/register) -->
  <div v-if="isAuthPage" id="app-layout" class="no-sidebar">
    <main class="main-content">
      <router-view />
    </main>
  </div>

  <!-- Mobile Layout -->
  <MobileLayout v-else-if="isMobile">
    <router-view name="mobile" />
  </MobileLayout>

  <!-- Desktop Layout -->
  <div v-else id="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- Overlay for mobile when sidebar is open -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, open: sidebarOpen }">
      <div class="sidebar-top">
        <div class="sidebar-logo">
          <div class="logo-icon">💸</div>
          <div class="sidebar-logo-text">
            <h1>DuitTracker</h1>
            <span>Kelola Keuanganmu</span>
          </div>
        </div>
        <button class="sidebar-toggle-btn" @click="toggleSidebar" title="Toggle Sidebar">
          {{ sidebarCollapsed ? '☰' : '✕' }}
        </button>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-link" exact>
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </router-link>
        <router-link to="/transaksi" class="nav-link">
          <span class="nav-icon">💳</span>
          <span>Transaksi</span>
        </router-link>
        <router-link to="/transaksi/tambah" class="nav-link">
          <span class="nav-icon">➕</span>
          <span>Tambah Transaksi</span>
        </router-link>
        <router-link to="/kategori" class="nav-link">
          <span class="nav-icon">🏷️</span>
          <span>Kategori</span>
        </router-link>
        <router-link to="/dompet" class="nav-link">
          <span class="nav-icon">👛</span>
          <span>Dompet / Rekening</span>
        </router-link>
        <router-link to="/transfer" class="nav-link">
          <span class="nav-icon">🔄</span>
          <span>Transfer</span>
        </router-link>
        <router-link to="/tagihan-rutin" class="nav-link">
          <span class="nav-icon">🔁</span>
          <span>Tagihan Rutin</span>
        </router-link>
        <router-link to="/anggaran" class="nav-link">
          <span class="nav-icon">🎯</span>
          <span>Target Anggaran</span>
        </router-link>
        <router-link to="/tabungan" class="nav-link">
          <span class="nav-icon">💎</span>
          <span>Target Tabungan</span>
        </router-link>
        <router-link to="/laporan" class="nav-link">
          <span class="nav-icon">📑</span>
          <span>Export Laporan</span>
        </router-link>
      </nav>
      <div class="sidebar-user">
        <button class="btn-theme-toggle" @click="toggleTheme">
          {{ isDark ? '☀️ Light Mode' : '🌙 Dark Mode' }}
        </button>
        <div class="user-info">
          <span class="user-icon">👤</span>
          <span class="user-name">{{ userName }}</span>
        </div>
        <button class="btn-logout" @click="handleLogout">🚪 Logout</button>
      </div>
    </aside>
    <main class="main-content">
      <div class="topbar">
        <button class="topbar-hamburger" @click="sidebarOpen = true">☰</button>
      </div>
      <div class="global-search-bar">
        <div class="search-input-wrapper">
          <span class="search-icon-gs">🔍</span>
          <input
            type="text"
            v-model="globalSearch"
            class="form-control search-input-gs"
            placeholder="Cari transaksi... (Enter untuk search)"
            @keydown.enter="doGlobalSearch"
          />
          <button v-if="globalSearch" class="search-clear" @click="globalSearch = ''">✕</button>
        </div>
      </div>
      <router-view name="desktop" />
    </main>
  </div>
</template>

<script>
import auth from './store/auth';
import MobileLayout from './mobile/MobileLayout.vue';

export default {
  name: 'App',
  components: { MobileLayout },
  data() {
    return {
      isDark: localStorage.getItem('theme') !== 'light',
      globalSearch: '',
      isMobile: window.innerWidth <= 768,
      sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
      sidebarOpen: false,
    };
  },
  computed: {
    isAuthPage() {
      return this.$route.meta.guest === true;
    },
    userName() {
      return auth.state.user?.nama || '';
    },
  },
  methods: {
    handleLogout() {
      auth.clearAuth();
      this.$router.push('/login');
    },
    toggleTheme() {
      this.isDark = !this.isDark;
      const theme = this.isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    },
    doGlobalSearch() {
      if (this.globalSearch.trim()) {
        this.$router.push({ path: '/transaksi', query: { q: this.globalSearch.trim() } });
        this.globalSearch = '';
      }
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
    },
    onResize() {
      this.isMobile = window.innerWidth <= 768;
      if (this.isMobile) this.sidebarOpen = false;
    },
  },
  mounted() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      this.isDark = false;
    }
    window.addEventListener('resize', this.onResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
  },
};
</script>
