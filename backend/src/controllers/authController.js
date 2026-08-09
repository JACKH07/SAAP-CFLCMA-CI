const authService = require('../services/authService');
const { asyncHandler } = require('../utils/errors');
const { publicUploadUrl } = require('../utils/uploads');

exports.register = asyncHandler(async (req, res) => {
  const photoUrl = req.file ? publicUploadUrl(req.file.filename) : null;
  const result = await authService.register(
    { ...req.body, photoUrl },
    { ip: req.ip }
  );
  res.status(201).json({ success: true, ...result });
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, { ip: req.ip });
  res.json({ success: true, ...result });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, membre: req.user });
});
