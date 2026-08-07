import axios from 'axios';
import { API_URL, paths } from '../config/env';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('saap_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('saap_token');
      localStorage.removeItem('saap_user');
      const { pathname } = window.location;
      const onAuthPage =
        pathname.startsWith(paths.login) ||
        pathname.startsWith(paths.adminLogin) ||
        pathname.startsWith(paths.register);
      // Échec de login : rester sur la page (admin_connecte ou login membre)
      if (!onAuthPage) {
        const isAdminArea = pathname.startsWith(paths.admin);
        window.location.href = isAdminArea ? paths.adminLogin : paths.login;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
