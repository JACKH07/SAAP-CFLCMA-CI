const bcrypt = require('bcryptjs');
require('../config'); // charge .env / .env.$APP_ENV
const prisma = require('../config/prisma');

const REGIONS_CI = [
  { nom: 'Abidjan', code: 'ABJ' },
  { nom: 'Yamoussoukro', code: 'YAM' },
  { nom: 'Bouaké', code: 'BKE' },
  { nom: 'Daloa', code: 'DAL' },
  { nom: 'Korhogo', code: 'KOR' },
  { nom: 'San-Pédro', code: 'SAP' },
  { nom: 'Man', code: 'MAN' },
  { nom: 'Gagnoa', code: 'GAG' },
  { nom: 'Abengourou', code: 'ABG' },
  { nom: 'Divo', code: 'DIV' },
  { nom: 'Anyama', code: 'ANY' },
  { nom: 'Agboville', code: 'AGB' },
  { nom: 'Grand-Bassam', code: 'GBA' },
  { nom: 'Bondoukou', code: 'BON' },
  { nom: 'Odienné', code: 'ODI' },
  { nom: 'Séguéla', code: 'SEG' },
  { nom: 'Boundiali', code: 'BDI' },
  { nom: 'Ferkessédougou', code: 'FER' },
  { nom: 'Katiola', code: 'KAT' },
  { nom: 'Daoukro', code: 'DAO' },
  { nom: 'Issia', code: 'ISS' },
  { nom: 'Sinfra', code: 'SIN' },
  { nom: 'Soubré', code: 'SOU' },
  { nom: 'Tabou', code: 'TAB' },
  { nom: 'Guiglo', code: 'GUI' },
  { nom: 'Duékoué', code: 'DUE' },
  { nom: 'Toumodi', code: 'TOU' },
  { nom: 'Tiassalé', code: 'TIA' },
  { nom: 'Adiaké', code: 'ADI' },
  { nom: 'Aboisso', code: 'ABO' },
];

const ROLES = [
  { nom: 'Coordinateur général (C.G.)', niveauHierarchique: 1 },
  { nom: 'Coordinateurs de région (C.D.R.)', niveauHierarchique: 2 },
  { nom: 'Coordinateurs de district (C.D.D.)', niveauHierarchique: 3 },
  { nom: 'Coordinateurs de paroisse (C.D.P.)', niveauHierarchique: 4 },
  { nom: 'Chefs de troupe (C.T.)', niveauHierarchique: 5 },
  { nom: 'Chefs de troupe adjoints (C.T.A.)', niveauHierarchique: 6 },
  { nom: 'Chefs de patrouille (C.P.)', niveauHierarchique: 7 },
  { nom: 'Sous-chefs de patrouille (S.P.)', niveauHierarchique: 8 },
  { nom: 'Membres actifs', niveauHierarchique: 9 },
];

/** Anciens libellés → nouveaux (migration seed) */
const ROLE_MIGRATIONS = {
  'Secrétaire général': 'Coordinateur général (C.G.)',
  'Coordinateur général': 'Coordinateur général (C.G.)',
  'Coordinateur régional': 'Coordinateurs de région (C.D.R.)',
  'Coordinateur de district': 'Coordinateurs de district (C.D.D.)',
  'Coordination de paroisse': 'Coordinateurs de paroisse (C.D.P.)',
  CT: 'Chefs de troupe (C.T.)',
  CTA: 'Chefs de troupe adjoints (C.T.A.)',
  CP: 'Chefs de patrouille (C.P.)',
  SP: 'Sous-chefs de patrouille (S.P.)',
  CLG: 'Membres actifs',
  Membres: 'Membres actifs',
};

const ACTIVITES = [
  { nom: 'Évangélique', prefixeIdPaiement: 'EYAWA', montantDefaut: 5000 },
  { nom: 'Mission', prefixeIdPaiement: 'NGLIÈ', montantDefaut: 5000 },
  { nom: 'Investissement / Siège (Écolet Motel)', prefixeIdPaiement: 'SIEGE', montantDefaut: 10000 },
  { nom: 'Activité sociale', prefixeIdPaiement: 'SOCIAL', montantDefaut: 3000 },
  { nom: 'Journée Nationale', prefixeIdPaiement: 'JN', montantDefaut: 2000 },
];

async function seed() {
  console.log('🌱 Seed SAAP CFLCMA-CI...');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { nom: role.nom },
      update: { niveauHierarchique: role.niveauHierarchique },
      create: role,
    });
  }

  for (const [ancienNom, nouveauNom] of Object.entries(ROLE_MIGRATIONS)) {
    if (ancienNom === nouveauNom) continue;
    const ancien = await prisma.role.findUnique({ where: { nom: ancienNom } });
    const nouveau = await prisma.role.findUnique({ where: { nom: nouveauNom } });
    if (!ancien || !nouveau || ancien.id === nouveau.id) continue;

    const data = { roleId: nouveau.id };
    if (nouveauNom === 'Coordinateur général (C.G.)') data.isAdmin = true;

    await prisma.membre.updateMany({ where: { roleId: ancien.id }, data });
    await prisma.historiqueMandat
      .updateMany({
        where: { roleId: ancien.id },
        data: { roleId: nouveau.id },
      })
      .catch(() => {});
    await prisma.role.delete({ where: { id: ancien.id } }).catch(() => {});
  }
  console.log(`✓ ${ROLES.length} rôles`);

  for (const region of REGIONS_CI) {
    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: { nom: region.nom },
      create: region,
    });

    const existingDistrict = await prisma.district.findFirst({
      where: { regionId: created.id, nom: `District ${region.nom}` },
    });
    if (!existingDistrict) {
      await prisma.district.create({
        data: { nom: `District ${region.nom}`, regionId: created.id },
      });
    }
  }
  console.log(`✓ ${REGIONS_CI.length} régions (+ districts initiaux)`);

  for (const activite of ACTIVITES) {
    await prisma.activite.upsert({
      where: { prefixeIdPaiement: activite.prefixeIdPaiement },
      update: {
        nom: activite.nom,
        montantDefaut: activite.montantDefaut,
        active: true,
      },
      create: activite,
    });
  }
  console.log(`✓ ${ACTIVITES.length} activités`);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@flccmaci.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminFLCCMACI2026!';
  const membresRole = await prisma.role.findUnique({ where: { nom: 'Membres actifs' } });
  const coordinateurGeneral = await prisma.role.findUnique({
    where: { nom: 'Coordinateur général (C.G.)' },
  });
  const abidjan = await prisma.region.findUnique({ where: { code: 'ABJ' } });
  const districtAbj = await prisma.district.findFirst({
    where: { regionId: abidjan.id },
  });

  const existingAdmin = await prisma.membre.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.membre.create({
      data: {
        nom: process.env.ADMIN_NOM || 'Administrateur',
        prenom: process.env.ADMIN_PRENOM || 'Systeme',
        email: adminEmail,
        contact: '0700000000',
        passwordHash: await bcrypt.hash(adminPassword, 12),
        dateNaissance: new Date('1990-01-01'),
        lieuNaissance: 'Abidjan',
        branche: 'FLAMBEAUX',
        idMembre: 'ADSY19900101',
        roleId: coordinateurGeneral?.id || membresRole.id,
        regionId: abidjan.id,
        districtId: districtAbj?.id,
        isAdmin: true,
        statut: 'VALIDE',
      },
    });
    console.log(`✓ Coordinateur général (C.G.) créé : ${adminEmail}`);
  } else if (coordinateurGeneral) {
    await prisma.membre.update({
      where: { id: existingAdmin.id },
      data: { roleId: coordinateurGeneral.id, isAdmin: true },
    });
    console.log(`✓ Coordinateur général (C.G.) déjà présent : ${adminEmail}`);
  }

  console.log('✅ Seed terminé');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
