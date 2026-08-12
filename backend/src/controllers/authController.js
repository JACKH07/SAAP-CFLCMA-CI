const authService = require('../services/authService');
const passwordResetService = require('../services/passwordResetService');
const { asyncHandler } = require('../utils/errors');
const { normalizePhotoStorageValue } = require('../utils/uploads');

exports.register = asyncHandler(async (req, res) => {
  const photoUrl = req.file ? normalizePhotoStorageValue(req.file.filename) : null;
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

exports.forgotPassword = asyncHandler(async (req, res) => {
  const data = await passwordResetService.requestReset(
    {
      email: req.body.email,
      contact: req.body.contact,
      identifiant: req.body.identifiant,
    },
    { ip: req.ip }
  );
  res.json({ success: true, data });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const data = await passwordResetService.resetPassword(
    {
      token: req.body.token,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword ?? req.body.confirm,
    },
    { ip: req.ip }
  );
  res.json({ success: true, data });
});
