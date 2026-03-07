<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-logo">
        <div class="logo-icon">💸</div>
        <h1>DuitTracker</h1>
        <p>Buat Akun Baru</p>
      </div>

      <div class="auth-card">
        <h2>Daftar Akun</h2>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="nama">Nama Lengkap</label>
            <input id="nama" type="text" class="form-control" v-model="nama" placeholder="Nama kamu" required />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" class="form-control" v-model="email" placeholder="email@contoh.com" required autocomplete="email" />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input id="password" type="password" class="form-control" v-model="password" placeholder="Minimal 6 karakter" required autocomplete="new-password" />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Konfirmasi Password</label>
            <input id="confirmPassword" type="password" class="form-control" v-model="confirmPassword" placeholder="Ulangi password" required autocomplete="new-password" />
          </div>

          <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
            {{ loading ? '⏳ Memproses...' : '🚀 Daftar' }}
          </button>
        </form>

        <div class="auth-footer">
          Sudah punya akun? <router-link to="/login">Login di sini</router-link>
        </div>
      </div>

      <div v-if="error" class="toast error">❌ {{ error }}</div>
      <div v-if="success" class="toast success">✅ {{ success }}</div>
    </div>
  </div>
</template>

<script>
import api from '../services/api';
import auth from '../store/auth';

export default {
  name: 'RegisterView',
  data() {
    return {
      nama: '',
      email: '',
      password: '',
      confirmPassword: '',
      loading: false,
      error: '',
      success: '',
    };
  },
  methods: {
    async handleRegister() {
      this.error = '';
      this.success = '';

      if (this.password !== this.confirmPassword) {
        this.error = 'Password dan konfirmasi password tidak cocok.';
        setTimeout(() => { this.error = ''; }, 4000);
        return;
      }

      if (this.password.length < 6) {
        this.error = 'Password minimal 6 karakter.';
        setTimeout(() => { this.error = ''; }, 4000);
        return;
      }

      this.loading = true;
      try {
        const { data } = await api.post('/auth/register', {
          nama: this.nama,
          email: this.email,
          password: this.password,
        });
        auth.setAuth(data.user, data.token);
        this.$router.push('/');
      } catch (err) {
        this.error = err.response?.data?.error || 'Registrasi gagal, coba lagi.';
        setTimeout(() => { this.error = ''; }, 4000);
      } finally {
        this.loading = false;
      }
    },
  },
  mounted() {
    if (auth.isLoggedIn()) {
      this.$router.push('/');
    }
  },
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 420px;
}

.auth-logo {
  text-align: center;
  margin-bottom: 32px;
}

.auth-logo .logo-icon {
  width: 64px;
  height: 64px;
  background: var(--accent-gradient);
  border-radius: var(--radius-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(67, 97, 238, 0.4);
}

.auth-logo h1 {
  font-size: 28px;
  font-weight: 800;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-logo p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 32px;
}

.auth-card h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 24px;
  text-align: center;
}

.btn-full {
  width: 100%;
  justify-content: center;
  padding: 14px;
  font-size: 15px;
  margin-top: 8px;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-footer a {
  color: var(--accent-blue);
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
