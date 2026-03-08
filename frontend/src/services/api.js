import axios from 'axios';

// Saat build production, set VITE_API_URL di environment variable
// Contoh: VITE_API_URL=https://duittracker-backend.onrender.com/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://duit-tracker--razaankp2005.replit.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
