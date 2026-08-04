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
      if (!pathname.startsWith(paths.login) && !pathname.startsWith(paths.register)) {
        window.location.href = paths.login;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
