const { VISIBILITE_TOUS, VISIBILITE_REGION } = require('./activiteVisibilite');

const MONTANT_PAIEMENT_ANNUEL = 150000;

/** Activités de cotisation / paiement (référence métier). */
const DEFAULT_ACTIVITES = [
  { nom: 'Évangélique', prefixeIdPaiement: 'EYAWA', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
  { nom: 'Mission', prefixeIdPaiement: 'NGLIÈ', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
  { nom: 'Investissement / Siège (Écolet Motel)', prefixeIdPaiement: 'SIEGE', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
  { nom: 'Activité sociale', prefixeIdPaiement: 'SOCIAL', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
  { nom: 'Journée Nationale', prefixeIdPaiement: 'JN', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
  {
    nom: 'Paiement Annuel',
    prefixeIdPaiement: 'ANNUEL',
    montantDefaut: MONTANT_PAIEMENT_ANNUEL,
    visibilite: VISIBILITE_REGION,
  },
];

async function ensureDefaultActivites(prismaClient) {
  for (const activite of DEFAULT_ACTIVITES) {
    const existing = await prismaClient.activite.findFirst({
      where: {
        OR: [{ prefixeIdPaiement: activite.prefixeIdPaiement }, { nom: activite.nom }],
      },
    });

    const data = {
      nom: activite.nom,
      prefixeIdPaiement: activite.prefixeIdPaiement,
      montantDefaut: activite.montantDefaut,
      visibilite: activite.visibilite,
      active: true,
    };

    if (existing) {
      await prismaClient.activite.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prismaClient.activite.create({ data });
    }
  }
  return DEFAULT_ACTIVITES.length;
}

module.exports = { DEFAULT_ACTIVITES, ensureDefaultActivites, MONTANT_PAIEMENT_ANNUEL };
