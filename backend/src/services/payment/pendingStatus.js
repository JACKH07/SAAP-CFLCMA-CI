const SUCCESS_STATUSES = new Set([
  'SUCCESS',
  'SUCCESSFUL',
  'SUCCEEDED',
  'SUCCESSFULL',
]);
const FAILED_STATUSES = new Set(['FAILED', 'CANCELLED', 'EXPIRED']);

function parseNotes(notes) {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return {};
  }
  return {};
}

function isTerminalPaymentStatus(status) {
  const normalized = String(status || '').toUpperCase();
  return SUCCESS_STATUSES.has(normalized) || FAILED_STATUSES.has(normalized);
}

function canPollProviderStatus(cotisation) {
  if (!cotisation) return false;
  if (!['EN_ATTENTE', 'PARTIEL'].includes(cotisation.statut)) return false;
  if (cotisation.modePaiement && cotisation.modePaiement !== 'MOBILE_MONEY') return false;

  const notes = parseNotes(cotisation.notes);
  const provider = String(cotisation.provider || 'ORANGE').toUpperCase();

  if (provider === 'WAVE') {
    return Boolean(notes.sessionId || cotisation.referenceExterne);
  }

  return Boolean(
    (notes.orangeOrderId || cotisation.idPaiement) &&
      (notes.payToken || cotisation.referenceExterne) &&
      notes.pendingAmount != null
  );
}

function buildStatusCheckPayload(cotisation) {
  const notes = parseNotes(cotisation.notes);
  const provider = String(cotisation.provider || 'ORANGE').toUpperCase();

  if (provider === 'WAVE') {
    return {
      provider,
      sessionId: notes.sessionId || cotisation.referenceExterne,
      transactionId: notes.transactionId || undefined,
    };
  }

  return {
    provider,
    orderId: notes.orangeOrderId || cotisation.idPaiement,
    payToken: notes.payToken || cotisation.referenceExterne,
    amount: notes.pendingAmount,
  };
}

module.exports = {
  parseNotes,
  isTerminalPaymentStatus,
  canPollProviderStatus,
  buildStatusCheckPayload,
  SUCCESS_STATUSES,
  FAILED_STATUSES,
};
