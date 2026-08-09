/**
 * URLs et chemins publics — lus depuis les variables VITE_* (.env)
 */
const env = import.meta.env;

function path(value, fallback) {
  const raw = (value || fallback || '/').trim();
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function joinUrl(base, routePath) {
  const root = (base || '').replace(/\/$/, '');
  if (!root) return routePath;
  return `${root}${routePath}`;
}

export const APP_ENV = env.VITE_APP_ENV || 'development';
export const APP_NAME = env.VITE_APP_NAME || 'SAAP CFLCMA-CI';
export const APP_URL = (env.VITE_APP_URL || '').replace(/\/$/, '');
export const API_URL = env.VITE_API_URL || '/api';

export const paths = {
  login: path(env.VITE_LOGIN_PATH, '/login'),
  adminLogin: path(env.VITE_ADMIN_LOGIN_PATH, '/admin_connecte'),
  register: path(env.VITE_REGISTER_PATH, '/register'),
  forgotPassword: path(env.VITE_FORGOT_PASSWORD_PATH, '/mot-de-passe-oublie'),
  resetPassword: path(env.VITE_RESET_PASSWORD_PATH, '/reset-password'),
  admin: path(env.VITE_ADMIN_PATH, '/admin'),
  adminMembres: path(env.VITE_ADMIN_MEMBRES_PATH, '/admin/membres'),
  adminCotisations: path(env.VITE_ADMIN_COTISATIONS_PATH, '/admin/cotisations'),
  adminBureau: path(env.VITE_ADMIN_BUREAU_PATH, '/admin/bureau'),
  adminCompte: path(env.VITE_ADMIN_COMPTE_PATH, '/admin/compte'),
  adminActivite: path(env.VITE_ADMIN_ACTIVITE_PATH, '/admin/activites'),
  profil: path(env.VITE_PROFIL_PATH, '/profil'),
  mesCotisations: path(env.VITE_MES_COTISATIONS_PATH, '/mes-cotisations'),
  paiement: path(env.VITE_PAIEMENT_PATH, '/mes-cotisations/payer'),
};

/** Liens absolus (si VITE_APP_URL / VITE_*_URL sont définis) */
function originFallback() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

const appBase = APP_URL || originFallback();

export const links = {
  app: appBase,
  api: API_URL.startsWith('http') ? API_URL : joinUrl(appBase, API_URL),
  login: env.VITE_LOGIN_URL || joinUrl(APP_URL, paths.login),
  adminLogin: env.VITE_ADMIN_LOGIN_URL || joinUrl(APP_URL, paths.adminLogin),
  register: env.VITE_REGISTER_URL || joinUrl(APP_URL, paths.register),
  admin: env.VITE_ADMIN_URL || joinUrl(APP_URL, paths.admin),
  adminMembres: env.VITE_ADMIN_MEMBRES_URL || joinUrl(APP_URL, paths.adminMembres),
  adminCotisations: env.VITE_ADMIN_COTISATIONS_URL || joinUrl(APP_URL, paths.adminCotisations),
  adminBureau: env.VITE_ADMIN_BUREAU_URL || joinUrl(APP_URL, paths.adminBureau),
  adminCompte: env.VITE_ADMIN_COMPTE_URL || joinUrl(APP_URL, paths.adminCompte),
  adminActivite: env.VITE_ADMIN_ACTIVITE_URL || joinUrl(APP_URL, paths.adminActivite),
  profil: env.VITE_PROFIL_URL || joinUrl(APP_URL, paths.profil),
  mesCotisations: env.VITE_MES_COTISATIONS_URL || joinUrl(APP_URL, paths.mesCotisations),
};

export default { APP_ENV, APP_NAME, APP_URL, API_URL, paths, links };
