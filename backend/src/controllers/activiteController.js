const activiteService = require('../services/activiteService');
const { asyncHandler } = require('../utils/errors');
const { hasAdminAccess } = require('../utils/roles');

exports.list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === 'true' || req.query.includeInactive === 'true';
  const includeRestricted = includeInactive && hasAdminAccess(req.user);
  const data = await activiteService.list({
    includeInactive: includeRestricted,
    viewer: req.user,
    includeRestricted,
  });
  res.json({ success: true, data });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await activiteService.getById(req.params.id);
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await activiteService.create(req.body);
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await activiteService.update(req.params.id, req.body);
  res.json({ success: true, data });
});
