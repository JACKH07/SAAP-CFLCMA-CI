import { create } from 'zustand';
import api from '../api/client';

const PORTAL_KEY = 'saap_portal';

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('saap_token'),
  user: JSON.parse(localStorage.getItem('saap_user') || 'null'),
  portal: localStorage.getItem(PORTAL_KEY) || null,
  loading: false,
  error: null,

  setSession(token, user, portal) {
    localStorage.setItem('saap_token', token);
    localStorage.setItem('saap_user', JSON.stringify(user));
    if (portal === 'admin' || portal === 'membre') {
      localStorage.setItem(PORTAL_KEY, portal);
    }
    set({
      token,
      user,
      error: null,
      portal: portal === 'admin' || portal === 'membre' ? portal : get().portal,
    });
  },

  setPortal(portal) {
    if (portal === 'admin' || portal === 'membre') {
      localStorage.setItem(PORTAL_KEY, portal);
      set({ portal });
    }
  },

  logout() {
    localStorage.removeItem('saap_token');
    localStorage.removeItem('saap_user');
    localStorage.removeItem(PORTAL_KEY);
    set({ token: null, user: null, portal: null });
  },

  async login(payload, portal) {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', payload);
      get().setSession(data.token, data.membre, portal);
      set({ loading: false });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Échec de la connexion';
      set({ loading: false, error: message });
      throw err;
    }
  },

  async register(payload) {
    set({ loading: true, error: null });
    try {
      const body =
        payload instanceof FormData
          ? payload
          : (() => {
              const fd = new FormData();
              Object.entries(payload).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') return;
                if (key === 'photo' && value instanceof File) {
                  fd.append('photo', value);
                } else {
                  fd.append(key, value);
                }
              });
              return fd;
            })();

      const { data } = await api.post('/auth/register', body);
      get().setSession(data.token, data.membre, 'membre');
      set({ loading: false });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Échec de l\'inscription';
      set({ loading: false, error: message });
      throw err;
    }
  },

  async refreshMe() {
    if (!get().token) return null;
    const { data } = await api.get('/membres/me');
    localStorage.setItem('saap_user', JSON.stringify(data.data));
    set({ user: data.data });
    return data.data;
  },
}));
