const membreService = require('../services/membreService');
const cotisationService = require('../services/cotisationService');
const { asyncHandler, AppError } = require('../utils/errors');
const { hasAdminAccess } = require('../utils/roles');
const fs = require('fs');
const path = require('path');

const SELF_EDITABLE_FIELDS = [
  'contact',
  'email',
  'situationMatrimoniale',
  'profession',
  'lieuNaissance',
  'password',
];

exports.getMe = asyncHandler(async (req, res) => {
  const membre = await membreService.getById(req.user.id);
  res.json({ success: true, data: membre });
});

exports.list = asyncHandler(async (req, res) => {
  const result = await membreService.list(req.query);
  res.json({ success: true, ...result });
});

exports.getById = asyncHandler(async (req, res) => {
  if (!hasAdminAccess(req.user) && Number(req.params.id) !== req.user.id) {
    throw new AppError('Accès limité à votre propre profil', 403);
  }
  const membre = await membreService.getById(req.params.id);
  res.json({ success: true, data: membre });
});

exports.create = asyncHandler(async (req, res) => {
  const membre = await membreService.createByAdmin(req.body, req.user.id, { ip: req.ip });
  res.status(201).json({ success: true, data: membre });
});

exports.updatePhoto = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const isSelf = targetId === req.user.id;
  const isAdmin = hasAdminAccess(req.user);

  if (!isSelf && !isAdmin) {
    throw new AppError('Accès limité à votre propre profil', 403);
  }
  if (!req.file) {
    throw new AppError('Photo requise', 400);
  }

  const filePath = req.file.path || path.join(cotisationService.ensureUploadDir(), req.file.filename);
  if (!fs.existsSync(filePath)) {
    throw new AppError(
      'Échec enregistrement de la photo (dossier uploads inaccessible). Vérifiez le volume /app/uploads dans Dokploy.',
      500
    );
  }

  const membre = await membreService.updatePhoto(targetId, req.file.filename, req.user.id, {
    ip: req.ip,
  });
  res.json({ success: true, data: membre, message: 'Photo mise à jour' });
});

exports.update = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const isSelf = targetId === req.user.id;
  const isAdmin = hasAdminAccess(req.user);

  if (!isAdmin && !isSelf) {
    throw new AppError('Accès limité à votre propre profil', 403);
  }

  let body = req.body;
  if (!isAdmin) {
    body = {};
    for (const key of SELF_EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) body[key] = req.body[key];
    }
    if (!Object.keys(body).length) {
      throw new AppError('Aucun champ modifiable fourni', 400);
    }
  }

  const membre = await membreService.update(targetId, body, req.user.id, {
    ip: req.ip,
    actorIsSuperAdmin: Boolean(req.user.isSuperAdmin),
  });
  res.json({ success: true, data: membre });
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await membreService.remove(req.params.id, req.user.id, {
    ip: req.ip,
    actorIsSuperAdmin: Boolean(req.user.isSuperAdmin),
  });
  res.json({ success: true, data, message: 'Membre supprimé' });
});
