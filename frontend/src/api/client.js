import axios from 'axios';
import { API_URL, paths } from '../config/env';
import { loginPathAfterSessionExpired } from '../utils/logout';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function isAuthPage(pathname) {
  return (
    pathname === paths.login ||
    pathname.startsWith(`${paths.login}/`) ||
    pathname === paths.adminLogin ||
    pathname.startsWith(`${paths.adminLogin}/`) ||
    pathname === paths.register ||
    pathname.startsWith(`${paths.register}/`) ||
    pathname === paths.forgotPassword ||
    pathname.startsWith(`${paths.forgotPassword}/`) ||
    pathname === paths.resetPassword ||
    pathname.startsWith(`${paths.resetPassword}/`)
  );
}

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
      const user = JSON.parse(localStorage.getItem('saap_user') || 'null');
      const { pathname } = window.location;
      localStorage.removeItem('saap_token');
      localStorage.removeItem('saap_user');
      localStorage.removeItem('saap_portal');
      if (!isAuthPage(pathname)) {
        window.location.href = loginPathAfterSessionExpired(pathname, user);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
