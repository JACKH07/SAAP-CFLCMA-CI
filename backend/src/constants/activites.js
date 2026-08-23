/** Activités de cotisation / paiement (référence métier). */
const DEFAULT_ACTIVITES = [
  { nom: 'Évangélique', prefixeIdPaiement: 'EYAWA', montantDefaut: 0 },
  { nom: 'Mission', prefixeIdPaiement: 'NGLIÈ', montantDefaut: 0 },
  { nom: 'Investissement / Siège (Écolet Motel)', prefixeIdPaiement: 'SIEGE', montantDefaut: 0 },
  { nom: 'Activité sociale', prefixeIdPaiement: 'SOCIAL', montantDefaut: 0 },
  { nom: 'Journée Nationale', prefixeIdPaiement: 'JN', montantDefaut: 0 },
];

async function ensureDefaultActivites(prisma) {
  for (const activite of DEFAULT_ACTIVITES) {
    await prisma.activite.upsert({
      where: { prefixeIdPaiement: activite.prefixeIdPaiement },
      update: {
        nom: activite.nom,
        montantDefaut: activite.montantDefaut,
        active: true,
      },
      create: {
        nom: activite.nom,
        prefixeIdPaiement: activite.prefixeIdPaiement,
        montantDefaut: activite.montantDefaut,
        active: true,
      },
    });
  }
  return DEFAULT_ACTIVITES.length;
}

module.exports = { DEFAULT_ACTIVITES, ensureDefaultActivites };
