require('../src/config');
const prisma = require('../src/config/prisma');
const { ensureDefaultActivites } = require('../src/constants/activites');

ensureDefaultActivites(prisma)
  .then((n) => {
    console.log(`✓ ${n} activités de paiement`);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
