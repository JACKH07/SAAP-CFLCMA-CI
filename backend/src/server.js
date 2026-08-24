const app = require('./app');
const config = require('./config');
const prisma = require('./config/prisma');
const { ensureDefaultActivites } = require('./constants/activites');
const { startPaymentStatusPoller } = require('./services/paymentStatusPoller');

async function start() {
  try {
    const n = await ensureDefaultActivites(prisma);
    console.log(`[activites] ${n} activités de paiement prêtes`);
  } catch (err) {
    console.warn(`[activites] impossible de créer les activités : ${err.message}`);
  }

  app.listen(config.port, () => {
    console.log(`SAAP CFLCMA-CI API [${config.appEnv}] sur le port ${config.port}`);
    startPaymentStatusPoller();
  });
}

start();
