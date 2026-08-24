const config = require('../config');
const paymentGateway = require('./payment');
const cotisationService = require('./cotisationService');

const MIN_INTERVAL_MS = 5_000;

function startPaymentStatusPoller() {
  const intervalMs = Number(config.payment?.statusPollIntervalMs || 0);

  if (paymentGateway.isMockMode()) {
    console.log('[payments] polling statut désactivé (mode mock)');
    return () => {};
  }

  if (!Number.isFinite(intervalMs) || intervalMs < MIN_INTERVAL_MS) {
    console.log('[payments] polling statut désactivé');
    return () => {};
  }

  let inFlight = false;

  async function tick() {
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await cotisationService.syncPendingMobileMoney();
      if (result.updated > 0) {
        console.log(
          `[payments] ${result.updated} paiement(s) confirmé(s) via API statut (${result.checked} vérifié(s))`
        );
      }
    } catch (err) {
      console.warn(`[payments] polling statut : ${err.message}`);
    } finally {
      inFlight = false;
    }
  }

  const timer = setInterval(tick, intervalMs);
  const first = setTimeout(tick, 4_000);
  console.log(`[payments] polling statut toutes les ${Math.round(intervalMs / 1000)} s`);

  return () => {
    clearInterval(timer);
    clearTimeout(first);
  };
}

module.exports = { startPaymentStatusPoller };
