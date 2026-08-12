const config = require('../config');

const LEGACY_UPLOAD_HOST =
  /(?:^|\/)uploads\/|onrender\.com|render\.com|flambeauxcmaci\.com\/api\/uploads/i;

/** Extrait le nom de fichier depuis une URL legacy ou un chemin relatif. */
function extractUploadFilename(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s || s.startsWith('data:')) return null;

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

function getUploadOrigin() {
  const apiPublic = (config.urls.apiPublic || '').replace(/\/$/, '');
  const fromApi = apiPublic.replace(/\/api$/i, '');
  if (fromApi && /^https?:\/\//i.test(fromApi)) {
    return fromApi;
  }

  const frontend = (config.urls.frontend || '').replace(/\/$/, '');
  if (frontend && /^https?:\/\//i.test(frontend)) {
    return frontend;
  }

  return '';
}

/**
 * URL publique d’un fichier uploadé (photo, justificatif).
 * Toujours sur le domaine courant (évite CSP img-src et URLs Render obsolètes).
 */
function publicUploadUrl(filenameOrPath) {
  const name = extractUploadFilename(filenameOrPath);
  if (!name) return null;

  const origin = getUploadOrigin();
  if (origin) {
    return `${origin}/uploads/${name}`;
  }
  return `/uploads/${name}`;
}

/** Normalise photoUrl → URL absolue sur le domaine actuel */
function absolutizePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (String(photoUrl).startsWith('data:')) return photoUrl;

  const name = extractUploadFilename(photoUrl);
  if (name) {
    return publicUploadUrl(name);
  }

  if (/^https?:\/\//i.test(photoUrl) && LEGACY_UPLOAD_HOST.test(photoUrl)) {
    return publicUploadUrl(photoUrl);
  }

  return publicUploadUrl(photoUrl) || photoUrl;
}

/** Valeur à persister en base : nom de fichier uniquement */
function normalizePhotoStorageValue(photoUrl) {
  return extractUploadFilename(photoUrl);
}

module.exports = {
  extractUploadFilename,
  publicUploadUrl,
  absolutizePhotoUrl,
  normalizePhotoStorageValue,
  getUploadOrigin,
};
