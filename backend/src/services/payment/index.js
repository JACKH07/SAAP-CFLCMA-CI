const { AppError } = require('../../utils/errors');
const config = require('../../config');
const orangeMoneyService = require('./orangeMoneyService');
const waveService = require('./waveService');

/** Providers supportés (extensible : MTN, etc.) */
const PROVIDERS = {
  ORANGE: orangeMoneyService,
  WAVE: waveService,
};

function normalizeProvider(provider) {
  return String(provider || 'ORANGE').trim().toUpperCase();
}

function getProviderService(provider) {
  const key = normalizeProvider(provider);
  const service = PROVIDERS[key];
  if (!service) {
    throw new AppError(
      `Moyen de paiement non supporté : ${provider}. Utilisez ORANGE ou WAVE.`,
      400
    );
  }
  return { key, service };
}

function isMockMode() {
  if (config.payment?.mockMode === true) return true;
  if (config.payment?.mockMode === false) return false;
  // Auto-mock si aucun provider n’a de credentials
  return !orangeMoneyService.isConfigured() && !waveService.isConfigured();
}

/**
 * Simule une réponse opérateur (tests sans credentials).
 */
async function mockInitiate({ provider, amount, orderId, phone }) {
  const result = String(config.payment?.mockResult || 'success').toLowerCase();
  const referenceExterne = `MOCK-${provider}-${Date.now()}-${orderId}`;

  // Petite latence pour coller au comportement réseau
  await new Promise((r) => setTimeout(r, 150));

  if (result === 'failed' || result === 'refuse') {
    throw new AppError('Paiement refusé (simulation mock)', 402, 'PAYMENT_REFUSED');
  }

  if (result === 'timeout') {
    throw new AppError('Délai dépassé (simulation mock)', 504, 'PAYMENT_TIMEOUT');
  }

  if (result === 'pending') {
    return {
      provider,
      status: 'PENDING',
      referenceExterne,
      paymentUrl: null,
      mock: true,
      message: `Paiement ${provider} en attente (mode test). Confirmez via webhook mock.`,
    };
  }

  // success (défaut) — valide immédiatement pour garder l’UX actuelle en local/prod sans clés
  return {
    provider,
    status: 'SUCCESS',
    referenceExterne,
    paymentUrl: null,
    mock: true,
    phone,
    amount: Number(amount),
    message: `Paiement ${provider} simulé avec succès (mode test).`,
  };
}

/**
 * Initie un paiement via le provider choisi (ou mock).
 */
async function initiatePayment({
  provider,
  amount,
  orderId,
  phone,
  reference,
  currency,
  returnUrl,
  cancelUrl,
  successUrl,
  errorUrl,
  notifUrl,
}) {
  const { key, service } = getProviderService(provider);

  if (isMockMode()) {
    return mockInitiate({ provider: key, amount, orderId, phone });
  }

  if (!service.isConfigured()) {
    throw new AppError(
      `Paiement ${key} non configuré. Renseignez les clés opérateur et PAYMENT_MOCK_MODE=false.`,
      503,
      'PROVIDER_UNAVAILABLE'
    );
  }

  if (key === 'ORANGE') {
    return service.initiatePayment({
      amount,
      orderId,
      phone,
      reference: reference || orderId,
      currency: currency || config.orangeMoney?.currency,
      returnUrl,
      cancelUrl,
      notifUrl,
    });
  }

  if (key === 'WAVE') {
    return service.initiatePayment({
      amount,
      orderId,
      phone,
      successUrl: successUrl || returnUrl,
      errorUrl: errorUrl || cancelUrl,
      clientReference: orderId,
    });
  }

  throw new AppError(`Provider non branché : ${key}`, 501);
}

async function checkStatus({ provider, ...rest }) {
  const { key, service } = getProviderService(provider);
  if (isMockMode() || !service.isConfigured()) {
    return { provider: key, status: 'PENDING', mock: true };
  }
  return service.checkStatus(rest);
}

function parseWebhook(provider, body) {
  const { key, service } = getProviderService(provider);
  return service.parseWebhook(body);
}

function verifyWebhook(provider, req) {
  const { service } = getProviderService(provider);
  return service.verifyWebhookSignature(req);
}

module.exports = {
  PROVIDERS,
  normalizeProvider,
  getProviderService,
  isMockMode,
  initiatePayment,
  checkStatus,
  parseWebhook,
  verifyWebhook,
  orangeMoneyService,
  waveService,
};
