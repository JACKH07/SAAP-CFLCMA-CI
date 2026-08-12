const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const cotisationService = require('../services/cotisationService');
const { extractUploadFilename } = require('../utils/uploads');

const LEGACY_BASE = (process.env.UPLOADS_LEGACY_BASE_URL || 'https://saap-cflcma-ci.onrender.com').replace(
  /\/$/,
  ''
);

const staticUploads = express.static(path.resolve(config.upload.dir), {
  maxAge: config.appEnv === 'production' ? '365d' : 0,
  fallthrough: true,
});

async function fetchAndCacheLegacy(filename, res) {
  if (!LEGACY_BASE) return false;

  const url = `${LEGACY_BASE}/uploads/${encodeURIComponent(filename)}`;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    const uploadDir = cotisationService.ensureUploadDir();
    const localPath = path.join(uploadDir, filename);
    fs.writeFileSync(localPath, buffer);

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
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
  const filename = extractUploadFilename(req.path);
  if (!filename || filename.includes('..')) {
    return next();
  }

  const localPath = path.join(cotisationService.ensureUploadDir(), filename);
  if (fs.existsSync(localPath)) {
    return staticUploads(req, res, next);
  }

  if (await fetchAndCacheLegacy(filename, res)) {
    return undefined;
  }

  return staticUploads(req, res, next);
}

module.exports = uploadServe;
