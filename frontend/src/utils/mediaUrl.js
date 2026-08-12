import { API_URL } from '../config/env';

function extractUploadFilename(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return null;

  const fromPath = s.match(/\/uploads\/([^/?#]+)$/i);
  if (fromPath) return fromPath[1];

  const bare = s.replace(/^\/+/, '');
  if (/^uploads\//i.test(bare)) {
    return bare.replace(/^uploads\//i, '');
  }

  if (!/[\\/]/.test(s) && !/^https?:\/\//i.test(s)) {
    return s;
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
