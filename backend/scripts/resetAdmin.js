#!/usr/bin/env node
/**
 * Met à jour le Super Admin (ADSY19900101) — email + mot de passe depuis l'environnement.
 * Usage prod (conteneur) :
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:reset:production
 */
require('../src/config');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

const ADMIN_ID = 'ADSY19900101';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email) {
    console.error('ERREUR : ADMIN_EMAIL requis');
    process.exit(1);
  }
  if (!password) {
    console.error('ERREUR : ADMIN_PASSWORD requis');
    process.exit(1);
  }

  const coordinateurGeneral = await prisma.role.findUnique({
    where: { nom: 'Coordinateur Général (CG)' },
  });
  if (!coordinateurGeneral) {
    console.error('ERREUR : rôle Coordinateur Général (CG) introuvable — lancez seed:production d’abord');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.membre.findUnique({ where: { idMembre: ADMIN_ID } });

  if (!existing) {
    const abidjan1 = await prisma.region.findUnique({ where: { code: 'ABJ1' } });
    const district = abidjan1
      ? await prisma.district.findFirst({ where: { regionId: abidjan1.id, nom: 'Cocody' } })
      : null;

    await prisma.membre.create({
      data: {
        nom: process.env.ADMIN_NOM || 'Administrateur',
        prenom: process.env.ADMIN_PRENOM || 'Flambeaux',
        email,
        contact: '0700000000',
        passwordHash,
        dateNaissance: new Date('1990-01-01'),
        lieuNaissance: 'Abidjan',
        branche: 'FLAMBEAUX',
        idMembre: ADMIN_ID,
        roleId: coordinateurGeneral.id,
        regionId: abidjan1?.id,
        districtId: district?.id,
        isAdmin: true,
        isSuperAdmin: true,
        statut: 'VALIDE',
      },
    });
    console.log(`✓ Super Admin créé : ${email} (${ADMIN_ID})`);
  } else {
    await prisma.membre.update({
      where: { id: existing.id },
      data: {
        email,
        passwordHash,
        roleId: coordinateurGeneral.id,
        isAdmin: true,
        isSuperAdmin: true,
        statut: 'VALIDE',
      },
    });
    console.log(`✓ Super Admin mis à jour : ${email} (${ADMIN_ID})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
