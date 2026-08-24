const app = require('./app');
const config = require('./config');
const prisma = require('./config/prisma');
const { ensureDefaultActivites } = require('./constants/activites');
const { startPaymentStatusPoller } = require('./services/paymentStatusPoller');
const cotisationService = require('./services/cotisationService');

async function start() {
  try {
    const n = await ensureDefaultActivites(prisma);
    console.log(`[activites] ${n} activités de paiement prêtes`);
  } catch (err) {
    console.warn(`[activites] impossible de créer les activités : ${err.message}`);
  }

  try {
    const filled = await cotisationService.backfillVersementsFromAudit();
    if (filled.created > 0) {
      console.log(
        `[payments] ${filled.created} versement(s) reconstruit(s) pour ${filled.cotisations} cotisation(s)`
      );
    }
  } catch (err) {
    console.warn(`[payments] backfill versements : ${err.message}`);
  }

  app.listen(config.port, () => {
    console.log(`SAAP CFLCMA-CI API [${config.appEnv}] sur le port ${config.port}`);
    startPaymentStatusPoller();
  });
}

start();
