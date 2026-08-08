const membreService = require('../services/membreService');
const { asyncHandler, AppError } = require('../utils/errors');
const { hasAdminAccess } = require('../utils/roles');

const SELF_EDITABLE_FIELDS = [
  'contact',
  'email',
  'situationMatrimoniale',
  'profession',
  'responsabiliteBureau',
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
