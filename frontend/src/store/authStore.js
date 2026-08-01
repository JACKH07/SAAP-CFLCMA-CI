import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('saap_token'),
  user: JSON.parse(localStorage.getItem('saap_user') || 'null'),
  loading: false,
  error: null,

  setSession(token, user) {
    localStorage.setItem('saap_token', token);
    localStorage.setItem('saap_user', JSON.stringify(user));
    set({ token, user, error: null });
  },

  logout() {
    localStorage.removeItem('saap_token');
    localStorage.removeItem('saap_user');
    set({ token: null, user: null });
  },

  async login(payload) {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', payload);
      get().setSession(data.token, data.membre);
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
      get().setSession(data.token, data.membre);
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
