const path = require('path');
const fs = require('fs');
const config = require('../config');
const { extractUploadFilename } = require('../utils/uploads');

const LEGACY_BASE = (process.env.UPLOADS_LEGACY_BASE_URL || 'https://saap-cflcma-ci.onrender.com').replace(
  /\/$/,
  ''
);

function uploadDir() {
  return config.upload.dir;
}

function filenameFromRequest(req) {
  const raw = (req.originalUrl || req.url || req.path || '').split('?')[0];
  return extractUploadFilename(raw);
}

function sendLocalFile(res, localPath) {
  res.set('Cache-Control', config.appEnv === 'production' ? 'public, max-age=31536000, immutable' : 'no-cache');
  return res.sendFile(localPath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }
  });
}

async function fetchAndCacheLegacy(filename, res) {
  if (!LEGACY_BASE) return false;

  const url = `${LEGACY_BASE}/uploads/${encodeURIComponent(filename)}`;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    const dir = uploadDir();
    fs.mkdirSync(dir, { recursive: true });
    const localPath = path.join(dir, filename);
    fs.writeFileSync(localPath, buffer);

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sert /uploads depuis le disque local ; tente un téléchargement depuis l’ancien hébergeur si absent.
 */
async function uploadServe(req, res, next) {
  const filename = filenameFromRequest(req);
  if (!filename || filename.includes('..')) {
    return next();
  }

  const localPath = path.join(uploadDir(), filename);
  if (fs.existsSync(localPath)) {
    return sendLocalFile(res, localPath);
  }

  if (await fetchAndCacheLegacy(filename, res)) {
    return undefined;
  }

  return res.status(404).json({ success: false, message: 'Fichier introuvable' });
}

module.exports = uploadServe;
