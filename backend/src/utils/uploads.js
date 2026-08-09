const config = require('../config');

/**
 * URL publique d’un fichier uploadé (photo, justificatif).
 * Ex. https://saap-cflcma-ci.onrender.com/uploads/xxx.jpg
 */
function publicUploadUrl(filenameOrPath) {
  if (!filenameOrPath) return null;
  const name = String(filenameOrPath)
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/uploads\//i, '')
    .replace(/^\/+/, '');
  if (!name) return null;

  const apiPublic = (config.urls.apiPublic || '').replace(/\/$/, '');
  const origin = apiPublic.replace(/\/api$/i, '');
  if (origin && /^https?:\/\//i.test(origin)) {
    return `${origin}/uploads/${name}`;
  }
  return `/uploads/${name}`;
}

/** Normalise photoUrl relative → absolue (API) */
function absolutizePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl) || String(photoUrl).startsWith('data:')) {
    return photoUrl;
  }
  return publicUploadUrl(photoUrl);
}

module.exports = { publicUploadUrl, absolutizePhotoUrl };
