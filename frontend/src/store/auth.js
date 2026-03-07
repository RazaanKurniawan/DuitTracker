import { reactive } from 'vue';
import api from '../services/api';

const state = reactive({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
});

function setAuth(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

function clearAuth() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  delete api.defaults.headers.common['Authorization'];
}

function isLoggedIn() {
  return !!state.token;
}

// Initialize token on load
if (state.token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
}

// Add response interceptor for 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default {
  state,
  setAuth,
  clearAuth,
  isLoggedIn,
};
