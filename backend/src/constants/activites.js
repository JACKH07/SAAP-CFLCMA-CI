const { VISIBILITE_TOUS, VISIBILITE_REGION } = require('./activiteVisibilite');
const { toPaymentSafeId } = require('../utils/text');

const MONTANT_PAIEMENT_ANNUEL = 150000;
const RETIRED_INSCRIPTION_PREFIXE = 'INSCRIT';
const RETIRED_INSCRIPTION_NOM = "Frais d'inscription";

/** Activités de cotisation / paiement (référence métier). */
const DEFAULT_ACTIVITES = [
  { nom: 'Évangélique', prefixeIdPaiement: 'EYAWA', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
  { nom: 'Mission', prefixeIdPaiement: 'NGLIE', montantDefaut: 0, visibilite: VISIBILITE_TOUS },
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
    const prefixeIdPaiement = toPaymentSafeId(activite.prefixeIdPaiement);
    const existing = await prismaClient.activite.findFirst({
      where: {
        OR: [
          { prefixeIdPaiement },
          { prefixeIdPaiement: activite.prefixeIdPaiement },
          { nom: activite.nom },
        ],
      },
    });

    const data = {
      nom: activite.nom,
      prefixeIdPaiement,
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

  const retiredPrefixe = toPaymentSafeId(RETIRED_INSCRIPTION_PREFIXE);
  const retired = await prismaClient.activite.findFirst({
    where: {
      OR: [
        { prefixeIdPaiement: retiredPrefixe },
        { prefixeIdPaiement: RETIRED_INSCRIPTION_PREFIXE },
        { nom: RETIRED_INSCRIPTION_NOM },
      ],
    },
  });
  if (retired?.active) {
    await prismaClient.activite.update({
      where: { id: retired.id },
      data: { active: false },
    });
  }

  await prismaClient.membre.updateMany({
    where: { statut: 'EN_ATTENTE', isAdmin: false, isSuperAdmin: false },
    data: { statut: 'VALIDE' },
  });

  return DEFAULT_ACTIVITES.length;
}

module.exports = { DEFAULT_ACTIVITES, ensureDefaultActivites, MONTANT_PAIEMENT_ANNUEL };
