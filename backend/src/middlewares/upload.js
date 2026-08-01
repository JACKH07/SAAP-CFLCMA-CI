const multer = require('multer');
const path = require('path');
const config = require('../config');
const cotisationService = require('../services/cotisationService');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, cotisationService.ensureUploadDir());
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    let ext = path.extname(file.originalname || '');
    if (!ext && file.mimetype?.startsWith('image/')) {
      const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
      ext = map[file.mimetype] || '.jpg';
    }
    cb(null, `${unique}${ext || '.bin'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    // Photos profil : images uniquement
    if (file.fieldname === 'photo') {
      const okExt = /\.(jpe?g|png|gif|webp)$/i.test(path.extname(file.originalname || ''));
      const okMime = Boolean(file.mimetype?.startsWith('image/'));
      if (!okExt && !okMime) {
        return cb(new Error('La photo doit être une image (JPG, PNG, WEBP)'));
      }
      return cb(null, true);
    }
    const allowed = /\.(jpe?g|png|gif|webp|pdf)$/i;
    if (!allowed.test(path.extname(file.originalname || ''))) {
      return cb(new Error('Format de fichier non autorisé (images ou PDF)'));
    }
    cb(null, true);
  },
});

module.exports = upload;
