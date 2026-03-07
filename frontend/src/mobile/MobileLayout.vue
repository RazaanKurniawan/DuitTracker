<template>
  <div class="m-app">
    <!-- Header -->
    <header class="m-header">
      <button v-if="showBack" class="m-header-back" @click="$router.back()">‹</button>
      <h1 class="m-header-title">{{ pageTitle }}</h1>
      <div class="m-header-avatar" @click="openProfile">
        <span>{{ userInitial }}</span>
      </div>
    </header>

    <!-- Content -->
    <main class="m-content">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="m-bottom-nav">
      <router-link to="/" class="m-nav-tab" :class="{ active: activeTab === 'home' }">
        <span class="m-nav-icon">📊</span>
        <span class="m-nav-text">Home</span>
      </router-link>
      <router-link to="/transaksi" class="m-nav-tab" :class="{ active: activeTab === 'transaksi' }">
        <span class="m-nav-icon">💳</span>
        <span class="m-nav-text">Transaksi</span>
      </router-link>
      <router-link to="/transaksi/tambah" class="m-nav-fab-wrapper">
        <div class="m-nav-fab-btn">➕</div>
      </router-link>
      <router-link to="/dompet" class="m-nav-tab" :class="{ active: activeTab === 'dompet' }">
        <span class="m-nav-icon">👛</span>
        <span class="m-nav-text">Dompet</span>
      </router-link>
      <button class="m-nav-tab" :class="{ active: showMore }" @click.stop="showMore = !showMore">
        <span class="m-nav-icon">☰</span>
        <span class="m-nav-text">Lainnya</span>
      </button>
    </nav>

    <!-- More Menu Bottom Sheet -->
    <transition name="m-overlay">
      <div v-if="showMore" class="m-more-overlay" @click="showMore = false">
        <transition name="m-slide">
          <div v-if="showMore" class="m-more-sheet" @click.stop>
            <div class="m-more-handle"></div>
            <h3 class="m-more-title">Menu Lainnya</h3>
            <div class="m-more-grid">
              <router-link
                v-for="item in moreItems"
                :key="item.path"
                :to="item.path"
                class="m-more-item"
                @click="showMore = false"
              >
                <span class="m-more-icon">{{ item.icon }}</span>
                <span class="m-more-label">{{ item.label }}</span>
              </router-link>
            </div>
            <div class="m-more-divider"></div>
            <button class="m-more-action" @click="toggleTheme">
              {{ isDark ? '☀️ Mode Terang' : '🌙 Mode Gelap' }}
            </button>
            <button class="m-more-action m-more-logout" @click="handleLogout">
              🚪 Keluar
            </button>
          </div>
        </transition>
      </div>
    </transition>
    <!-- Profile Edit Modal -->
    <MobileModal v-model="showProfile" title="✏️ Edit Profil">
      <div class="m-profile-avatar-lg">
        <span>{{ userInitial }}</span>
      </div>
      <div class="m-form-group">
        <label>Nama</label>
        <input v-model="profileForm.nama" class="m-input" placeholder="Nama lengkap" />
      </div>
      <div class="m-form-group">
        <label>Email</label>
        <input type="email" v-model="profileForm.email" class="m-input" placeholder="Email" />
      </div>
      <div class="m-form-group">
        <label>Password Lama <small>(kosongkan jika tidak ingin ganti)</small></label>
        <input type="password" v-model="profileForm.password" class="m-input" placeholder="Password lama" />
      </div>
      <div class="m-form-group">
        <label>Password Baru</label>
        <input type="password" v-model="profileForm.passwordBaru" class="m-input" placeholder="Password baru (min 6 karakter)" />
      </div>
      <button class="m-btn m-btn-primary m-btn-block" @click="saveProfile" :disabled="savingProfile">
        {{ savingProfile ? 'Menyimpan...' : '💾 Simpan Profil' }}
      </button>
      <div v-if="profileMsg" class="m-profile-msg" :class="profileMsgType">{{ profileMsg }}</div>
    </MobileModal>
  </div>
</template>

<script>
import auth from '../store/auth';
import api from '../services/api';
import MobileModal from './components/MobileModal.vue';
import './mobile.css';

const titleMap = {
  Dashboard: 'DuitTracker',
  Transaksi: 'Transaksi',
  TambahTransaksi: 'Tambah Transaksi',
  EditTransaksi: 'Edit Transaksi',
  Kategori: 'Kategori',
  Dompet: 'Dompet',
  Transfer: 'Transfer',
  TagihanRutin: 'Tagihan Rutin',
  Anggaran: 'Target Anggaran',
  Tabungan: 'Target Tabungan',
  Laporan: 'Laporan',
};

const mainTabs = ['Dashboard', 'Transaksi', 'Dompet'];

export default {
  name: 'MobileLayout',
  components: { MobileModal },
  data() {
    return {
      showMore: false,
      showProfile: false,
      isDark: localStorage.getItem('theme') !== 'light',
      profileForm: { nama: '', email: '', password: '', passwordBaru: '' },
      savingProfile: false,
      profileMsg: '',
      profileMsgType: 'success',
      moreItems: [
        { icon: '🏷️', label: 'Kategori', path: '/kategori' },
        { icon: '🔄', label: 'Transfer', path: '/transfer' },
        { icon: '🔁', label: 'Tagihan', path: '/tagihan-rutin' },
        { icon: '🎯', label: 'Anggaran', path: '/anggaran' },
        { icon: '💎', label: 'Tabungan', path: '/tabungan' },
        { icon: '📑', label: 'Laporan', path: '/laporan' },
      ],
    };
  },
  computed: {
    pageTitle() {
      return titleMap[this.$route.name] || 'DuitTracker';
    },
    showBack() {
      return !mainTabs.includes(this.$route.name);
    },
    activeTab() {
      const name = this.$route.name;
      if (name === 'Dashboard') return 'home';
      if (['Transaksi', 'TambahTransaksi', 'EditTransaksi'].includes(name)) return 'transaksi';
      if (name === 'Dompet') return 'dompet';
      return '';
    },
    userInitial() {
      const nama = auth.state.user?.nama || '';
      return nama.charAt(0).toUpperCase() || '?';
    },
  },
  methods: {
    toggleTheme() {
      this.isDark = !this.isDark;
      const theme = this.isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    },
    handleLogout() {
      this.showMore = false;
      auth.clearAuth();
      this.$router.push('/login');
    },
    openProfile() {
      this.profileForm = {
        nama: auth.state.user?.nama || '',
        email: auth.state.user?.email || '',
        password: '',
        passwordBaru: '',
      };
      this.profileMsg = '';
      this.showProfile = true;
    },
    async saveProfile() {
      this.savingProfile = true;
      this.profileMsg = '';
      try {
        const payload = {
          nama: this.profileForm.nama,
          email: this.profileForm.email,
        };
        if (this.profileForm.passwordBaru) {
          payload.password = this.profileForm.password;
          payload.passwordBaru = this.profileForm.passwordBaru;
        }
        const res = await api.put('/auth/profile', payload);
        auth.setAuth(res.data.user, res.data.token);
        this.profileMsg = res.data.message || 'Profil diperbarui!';
        this.profileMsgType = 'success';
      } catch (err) {
        this.profileMsg = err.response?.data?.error || 'Gagal memperbarui profil';
        this.profileMsgType = 'error';
      } finally {
        this.savingProfile = false;
      }
    },
  },
  watch: {
    '$route'() {
      this.showMore = false;
    },
  },
};
</script>

<style scoped>
.m-app {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

/* Header */
.m-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 100;
  padding-top: env(safe-area-inset-top, 0);
}
.m-header-back {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  font-size: 28px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  padding: 0;
}
.m-header-title {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.m-header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
}

/* Content */
.m-content {
  flex: 1;
  padding-top: 56px;
  padding-bottom: 72px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Bottom Navigation */
.m-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.m-nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 10px;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.2s;
  min-width: 52px;
}
.m-nav-tab.active {
  color: var(--accent-blue);
}
.m-nav-icon {
  font-size: 22px;
  line-height: 1;
}
.m-nav-text {
  font-size: 10px;
  font-weight: 500;
}
.m-nav-fab-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  margin-top: -20px;
}
.m-nav-fab-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(67, 97, 238, 0.4);
  transition: transform 0.2s;
}
.m-nav-fab-wrapper:active .m-nav-fab-btn {
  transform: scale(0.92);
}

/* More Menu Sheet */
.m-more-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.m-more-sheet {
  width: 100%;
  background: var(--bg-secondary);
  border-radius: 20px 20px 0 0;
  padding: 0 20px 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0));
}
.m-more-handle {
  width: 40px;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  margin: 12px auto 16px;
}
.m-more-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.m-more-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.m-more-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  text-decoration: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}
.m-more-item:active {
  background: var(--bg-card-hover);
}
.m-more-icon {
  font-size: 28px;
}
.m-more-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0 12px;
}
.m-more-action {
  display: block;
  width: 100%;
  padding: 14px;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s;
}
.m-more-action:active {
  background: var(--bg-card);
}
.m-more-logout {
  color: var(--accent-red);
}

/* Transitions */
.m-overlay-enter-active,
.m-overlay-leave-active {
  transition: opacity 0.3s;
}
.m-overlay-enter-from,
.m-overlay-leave-to {
  opacity: 0;
}
.m-slide-enter-active,
.m-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.m-slide-enter-from,
.m-slide-leave-to {
  transform: translateY(100%);
}

/* Profile Modal */
.m-profile-avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  margin: 0 auto 20px;
}
.m-profile-msg {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}
.m-profile-msg.success {
  background: rgba(46, 213, 115, 0.15);
  color: #2ed573;
}
.m-profile-msg.error {
  background: rgba(255, 71, 87, 0.15);
  color: #ff4757;
}
</style>
