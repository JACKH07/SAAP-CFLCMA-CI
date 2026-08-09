import { API_URL } from '../config/env';

/**
 * Résout une URL média (photo, justificatif).
 * En prod, `/uploads/...` est servi par l’API Render, pas par Hostinger.
 */
export function mediaUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  const raw = String(pathOrUrl).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const api = String(API_URL || '/api');

  if (/^https?:\/\//i.test(api)) {
    const origin = api.replace(/\/api\/?$/i, '').replace(/\/$/, '');
    return `${origin}${path}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  return path;
}
