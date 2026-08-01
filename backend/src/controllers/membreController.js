const membreService = require('../services/membreService');
const { asyncHandler, AppError } = require('../utils/errors');

exports.getMe = asyncHandler(async (req, res) => {
  const membre = await membreService.getById(req.user.id);
  res.json({ success: true, data: membre });
});

exports.list = asyncHandler(async (req, res) => {
  const result = await membreService.list(req.query);
  res.json({ success: true, ...result });
});

exports.getById = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin && Number(req.params.id) !== req.user.id) {
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
  const membre = await membreService.update(req.params.id, req.body, req.user.id, {
    ip: req.ip,
  });
  res.json({ success: true, data: membre });
});
