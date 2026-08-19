import { API_URL } from '../config/env';

function extractUploadFilename(value) {
  if (!value) return null;
  let s = String(value).trim();
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return null;

  s = s.split('#')[0].split('?')[0];
  try {
    s = decodeURIComponent(s);
  } catch {
    /* garder la valeur brute */
  }

  const fromPath = s.match(/\/(?:api\/)?uploads\/([^/]+)$/i);
  if (fromPath) return fromPath[1];

  const bare = s.replace(/^\/+/, '');
  if (/^(?:api\/)?uploads\//i.test(bare)) {
    return bare.replace(/^(?:api\/)?uploads\//i, '');
  }

  if (!/[\\/]/.test(s) && !/^https?:\/\//i.test(s)) {
    return s;
  }

  const last = s.split('/').pop();
  if (last && /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(last)) {
    return last;
  }

  return null;
}

function uploadOrigin() {
  const api = String(API_URL || '/api');
  if (/^https?:\/\//i.test(api)) {
    return api.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/**
 * Résout une URL média (photo, justificatif).
 * Réécrit les anciennes URLs Render vers le domaine courant (/uploads).
 */
export function mediaUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  const raw = String(pathOrUrl).trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const filename = extractUploadFilename(raw);
  if (filename) {
    const origin = uploadOrigin();
    return origin ? `${origin}/uploads/${filename}` : `/uploads/${filename}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const pathPart = raw.startsWith('/') ? raw : `/${raw}`;
  const origin = uploadOrigin();
  return origin ? `${origin}${pathPart}` : pathPart;
}
