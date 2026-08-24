function resolveVersementIncrement({ pendingAmount, amount } = {}) {
  const pending = Number(pendingAmount);
  if (Number.isFinite(pending) && pending > 0) return pending;
  const raw = Number(amount);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 0;
}

function buildIdempotenceKey(cotisationId, { orderId, referenceExterne } = {}) {
  const unique = orderId || referenceExterne;
  if (!cotisationId || !unique) return null;
  return `${cotisationId}:${unique}`.slice(0, 120);
}

function providerLabel(provider, modePaiement) {
  const key = String(provider || '').toUpperCase();
  if (key === 'ORANGE') return 'Orange Money';
  if (key === 'WAVE') return 'Wave';
  if (String(modePaiement || '').toUpperCase() === 'MANUEL') return 'Saisie manuelle';
  return provider || modePaiement || 'Paiement';
}

module.exports = {
  resolveVersementIncrement,
  buildIdempotenceKey,
  providerLabel,
};
