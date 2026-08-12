const cotisationService = require('../services/cotisationService');
const paymentGateway = require('../services/payment');
const { asyncHandler, AppError } = require('../utils/errors');
const { publicUploadUrl } = require('../utils/uploads');

exports.listMine = asyncHandler(async (req, res) => {
  const data = await cotisationService.listMine(req.user.id);
  res.json({ success: true, data });
});

exports.list = asyncHandler(async (req, res) => {
  const result = await cotisationService.listAdmin(req.query);
  res.json({ success: true, ...result });
});

exports.findByPaymentId = asyncHandler(async (req, res) => {
  const data = await cotisationService.findByPaymentId(req.params.idPaiement);
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const isSg = Boolean(req.user.isAdmin);
  const mode = req.body.modePaiement || (isSg ? 'MANUEL' : 'MOBILE_MONEY');

  if (mode === 'MANUEL') {
    if (!isSg) {
      throw new AppError('La saisie manuelle est réservée au Coordinateur Général (CG)', 403);
    }
    const justificatifUrl = req.file
      ? publicUploadUrl(req.file.filename)
      : req.body.justificatifUrl || null;

    const data = await cotisationService.recordManualPayment(
      { ...req.body, justificatifUrl },
      req.user.id,
      { ip: req.ip }
    );
    return res.status(201).json({ success: true, data });
  }

  const membreId = isSg && req.body.membreId ? Number(req.body.membreId) : req.user.id;

  if (!isSg && membreId !== req.user.id) {
    throw new AppError('Vous ne pouvez payer que pour vous-même', 403);
  }

  const data = await cotisationService.initiateMobileMoney(
    {
      membreId,
      activiteId: req.body.activiteId,
      provider: req.body.provider,
      phone: req.body.phone || req.user.contact,
      montant: req.body.montant,
    },
    req.user.id
  );
  res.status(201).json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await cotisationService.remove(req.params.id, req.user.id, { ip: req.ip });
  res.json({ success: true, data, message: 'Paiement supprimé' });
});

async function handleProviderWebhook(provider, req, res) {
  if (!paymentGateway.verifyWebhook(provider, req)) {
    throw new AppError('Signature webhook invalide', 401);
  }
  const parsed = paymentGateway.parseWebhook(provider, req.body || {});
  const data = await cotisationService.confirmWebhook({
    idPaiement: parsed.idPaiement,
    referenceExterne: parsed.referenceExterne,
    status: parsed.status,
    amount: parsed.amount,
    provider: parsed.provider || provider,
  });
  res.json({ success: true, data });
}

exports.webhookOrange = asyncHandler(async (req, res) => {
  await handleProviderWebhook('ORANGE', req, res);
});

exports.webhookWave = asyncHandler(async (req, res) => {
  await handleProviderWebhook('WAVE', req, res);
});

/** Conservé pour compatibilité / future MTN MoMo */
exports.webhookMtn = asyncHandler(async (req, res) => {
  const data = await cotisationService.confirmWebhook({
    idPaiement: req.body.idPaiement,
    referenceExterne:
      req.body.externalId || req.body.referenceExterne || req.body.financialTransactionId,
    status: req.body.status,
    amount: req.body.amount,
    provider: 'MTN',
  });
  res.json({ success: true, data });
});
