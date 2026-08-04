const bcrypt = require('bcryptjs');
require('../config'); // charge .env / .env.$APP_ENV
const prisma = require('../config/prisma');
const { normalizeText } = require('../utils/text');
const HIERARCHIE_GEO = require('./hierarchieGeo');

/** Régions CI hors hiérarchie détaillée (district générique uniquement) */
const REGIONS_CI = [
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
  { nom: 'Adiaké', code: 'ADI' },
];

const HIERARCHIE_CODES = new Set(HIERARCHIE_GEO.map((h) => h.code));

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
  CLJ: 'Membres actifs',
  Membres: 'Membres actifs',
};

const ACTIVITES = [
  { nom: 'Évangélique', prefixeIdPaiement: 'EYAWA', montantDefaut: 5000 },
  { nom: 'Mission', prefixeIdPaiement: 'NGLIÈ', montantDefaut: 5000 },
  { nom: 'Investissement / Siège (Écolet Motel)', prefixeIdPaiement: 'SIEGE', montantDefaut: 10000 },
  { nom: 'Activité sociale', prefixeIdPaiement: 'SOCIAL', montantDefaut: 3000 },
  { nom: 'Journée Nationale', prefixeIdPaiement: 'JN', montantDefaut: 2000 },
];

async function upsertParoisse(districtId, nom) {
  const nomNormalise = normalizeText(nom);
  const existing = await prisma.paroisse.findFirst({
    where: { districtId, nomNormalise },
  });
  if (existing) {
    return prisma.paroisse.update({
      where: { id: existing.id },
      data: { nom },
    });
  }
  return prisma.paroisse.create({
    data: { nom, nomNormalise, districtId },
  });
}

/** Trouve un district par nom exact ou ancien préfixe "District …" */
async function findDistrict(regionId, districtNom) {
  const candidates = [
    districtNom,
    `District ${districtNom}`,
    `District de ${districtNom}`,
    `District d'${districtNom}`,
  ];
  for (const nom of candidates) {
    const found = await prisma.district.findFirst({
      where: { regionId, nom },
    });
    if (found) return found;
  }
  return null;
}

async function seedHierarchieGeo() {
  let districtCount = 0;
  let paroisseCount = 0;

  for (const entry of HIERARCHIE_GEO) {
    const region = await prisma.region.upsert({
      where: { code: entry.code },
      update: { nom: entry.region },
      create: { nom: entry.region, code: entry.code },
    });

    // Supprimer l’ancien district générique "District {région}" s’il n’est plus utile
    const generic = await prisma.district.findFirst({
      where: { regionId: region.id, nom: `District ${entry.region}` },
    });

    for (const distDef of entry.districts) {
      let district = await findDistrict(region.id, distDef.district);
      if (!district) {
        district = await prisma.district.create({
          data: { nom: distDef.district, regionId: region.id },
        });
      } else if (district.nom !== distDef.district) {
        district = await prisma.district.update({
          where: { id: district.id },
          data: { nom: distDef.district },
        });
      }
      districtCount += 1;

      for (const paroisseNom of distDef.paroisses) {
        await upsertParoisse(district.id, paroisseNom);
        paroisseCount += 1;
      }
    }

    if (generic) {
      const stillUsed = entry.districts.some(
        (d) =>
          d.district === generic.nom ||
          `District ${d.district}` === generic.nom
      );
      if (!stillUsed) {
        const paroisses = await prisma.paroisse.findMany({ where: { districtId: generic.id } });
        if (paroisses.length === 0) {
          await prisma.membre.updateMany({
            where: { districtId: generic.id },
            data: { districtId: null },
          });
          await prisma.cotisation.updateMany({
            where: { districtId: generic.id },
            data: { districtId: null },
          });
          await prisma.district.delete({ where: { id: generic.id } }).catch(() => {});
        }
      }
    }
  }

  // Migrer l'ancienne région unique "Abidjan" (ABJ) vers Abidjan 1
  const oldAbj = await prisma.region.findUnique({ where: { code: 'ABJ' } });
  const abj1 = await prisma.region.findUnique({ where: { code: 'ABJ1' } });
  if (oldAbj && abj1) {
    const cocody = await findDistrict(abj1.id, 'Cocody');

    await prisma.membre.updateMany({
      where: { regionId: oldAbj.id },
      data: {
        regionId: abj1.id,
        ...(cocody ? { districtId: cocody.id } : {}),
      },
    });
    await prisma.cotisation.updateMany({
      where: { regionId: oldAbj.id },
      data: {
        regionId: abj1.id,
        ...(cocody ? { districtId: cocody.id } : {}),
      },
    });
    await prisma.historiqueMandat
      .updateMany({
        where: { regionId: oldAbj.id },
        data: {
          regionId: abj1.id,
          ...(cocody ? { districtId: cocody.id } : {}),
        },
      })
      .catch(() => {});

    const oldDistricts = await prisma.district.findMany({ where: { regionId: oldAbj.id } });
    for (const d of oldDistricts) {
      const paroisses = await prisma.paroisse.findMany({ where: { districtId: d.id } });
      for (const p of paroisses) {
        await prisma.communaute.deleteMany({ where: { paroisseId: p.id } });
        await prisma.membre.updateMany({ where: { paroisseId: p.id }, data: { paroisseId: null } });
        await prisma.cotisation.updateMany({ where: { paroisseId: p.id }, data: { paroisseId: null } });
        await prisma.paroisse.delete({ where: { id: p.id } });
      }
      await prisma.membre.updateMany({
        where: { districtId: d.id },
        data: { districtId: cocody?.id || null },
      });
      await prisma.cotisation.updateMany({
        where: { districtId: d.id },
        data: { districtId: cocody?.id || null },
      });
      await prisma.district.delete({ where: { id: d.id } });
    }

    await prisma.region.delete({ where: { id: oldAbj.id } }).catch(() => {});
    console.log('✓ Ancienne région Abidjan (ABJ) migrée vers Abidjan 1');
  }

  // Migrer Bouaké (BKE) → Bouaké 1 (BK1) si besoin
  const oldBke = await prisma.region.findUnique({ where: { code: 'BKE' } });
  const bk1 = await prisma.region.findUnique({ where: { code: 'BK1' } });
  if (oldBke && bk1) {
    const firstDist = await prisma.district.findFirst({
      where: { regionId: bk1.id },
      orderBy: { nom: 'asc' },
    });
    await prisma.membre.updateMany({
      where: { regionId: oldBke.id },
      data: { regionId: bk1.id, districtId: firstDist?.id || null },
    });
    await prisma.cotisation.updateMany({
      where: { regionId: oldBke.id },
      data: { regionId: bk1.id, districtId: firstDist?.id || null },
    });
  }

  // Supprimer anciennes régions devenues districts (Tiassalé, Aboisso, Agboville générique déjà géré)
  for (const obsolete of [
    { code: 'TIA', label: 'Tiassalé' },
    { code: 'ABO', label: 'Aboisso' },
  ]) {
    const reg = await prisma.region.findUnique({ where: { code: obsolete.code } });
    if (!reg) continue;
    const hasMembres = await prisma.membre.count({ where: { regionId: reg.id } });
    if (hasMembres > 0) continue;
    const dists = await prisma.district.findMany({ where: { regionId: reg.id } });
    let canDelete = true;
    for (const d of dists) {
      const pCount = await prisma.paroisse.count({ where: { districtId: d.id } });
      if (pCount > 0) {
        canDelete = false;
        break;
      }
    }
    if (!canDelete) continue;
    for (const d of dists) {
      await prisma.district.delete({ where: { id: d.id } }).catch(() => {});
    }
    await prisma.region.delete({ where: { id: reg.id } }).catch(() => {});
    console.log(`✓ Région obsolète ${obsolete.label} (${obsolete.code}) retirée`);
  }

  console.log(
    `✓ Hiérarchie : ${HIERARCHIE_GEO.length} régions, ${districtCount} districts, ${paroisseCount} paroisses`
  );
}

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

  await seedHierarchieGeo();

  for (const region of REGIONS_CI) {
    if (HIERARCHIE_CODES.has(region.code)) continue;

    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: { nom: region.nom },
      create: region,
    });

    const existingDistrict = await prisma.district.findFirst({
      where: { regionId: created.id, nom: `District ${region.nom}` },
    });
    if (!existingDistrict) {
      const anyDistrict = await prisma.district.findFirst({ where: { regionId: created.id } });
      if (!anyDistrict) {
        await prisma.district.create({
          data: { nom: `District ${region.nom}`, regionId: created.id },
        });
      }
    }
  }
  console.log(`✓ ${REGIONS_CI.filter((r) => !HIERARCHIE_CODES.has(r.code)).length} autres régions`);

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
  const abidjan1 = await prisma.region.findUnique({ where: { code: 'ABJ1' } });
  const districtCocody = await findDistrict(abidjan1.id, 'Cocody');

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
        regionId: abidjan1.id,
        districtId: districtCocody?.id,
        isAdmin: true,
        statut: 'VALIDE',
      },
    });
    console.log(`✓ Coordinateur général (C.G.) créé : ${adminEmail}`);
  } else {
    await prisma.membre.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash: await bcrypt.hash(adminPassword, 12),
        roleId: coordinateurGeneral?.id || existingAdmin.roleId,
        isAdmin: true,
        statut: 'VALIDE',
        regionId: abidjan1.id,
        districtId: districtCocody?.id || existingAdmin.districtId,
      },
    });
    console.log(`✓ Coordinateur général (C.G.) mis à jour : ${adminEmail}`);
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
