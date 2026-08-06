const adminAccountService = require('../services/adminAccountService');
const { asyncHandler } = require('../utils/errors');

exports.list = asyncHandler(async (req, res) => {
  const items = await adminAccountService.listAdmins(req.query);
  res.json({ success: true, items });
});

exports.create = asyncHandler(async (req, res) => {
  const admin = await adminAccountService.createAdmin(req.body, req.user.id, { ip: req.ip });
  res.status(201).json({ success: true, data: admin });
});

exports.update = asyncHandler(async (req, res) => {
  const admin = await adminAccountService.updateAdmin(req.params.id, req.body, req.user.id, {
    ip: req.ip,
  });
  res.json({ success: true, data: admin });
});
