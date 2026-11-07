const {
  isOfficierRegion,
  canSeeActivite,
  assertCanPayActivite,
  filterActivitesForViewer,
} = require('../activiteAccess');

const activiteTous = { id: 1, nom: 'Mission', visibilite: 'TOUS' };
const activiteAnnuel = { id: 2, nom: 'Paiement Annuel', visibilite: 'REGION' };
const activiteInscription = {
  id: 3,
  nom: "Frais d'inscription",
  prefixeIdPaiement: 'INSCRIT',
  visibilite: 'TOUS',
};

function membre(overrides = {}) {
  return {
    id: 10,
    isAdmin: false,
    isSuperAdmin: false,
    titre: null,
    role: { nom: 'Membres' },
    responsabiliteBureau: null,
    ...overrides,
  };
}

describe('activiteAccess', () => {
  test('reconnaît le coordinateur et le commissaire de région', () => {
    expect(isOfficierRegion(membre({ titre: { nom: 'Coordinateur de Région (CDR)' } }))).toBe(true);
    expect(isOfficierRegion(membre({ role: { nom: 'Commissaire de Région (CR)' } }))).toBe(true);
    expect(isOfficierRegion(membre({ responsabiliteBureau: 'Coordinateur de région' }))).toBe(true);
    expect(isOfficierRegion(membre())).toBe(false);
  });

  test('masque le paiement annuel aux autres membres', () => {
    expect(canSeeActivite(membre(), activiteTous)).toBe(true);
    expect(canSeeActivite(membre(), activiteAnnuel)).toBe(false);
    expect(
      canSeeActivite(membre({ titre: { nom: 'Coordinateur de Région (CDR)' } }), activiteAnnuel)
    ).toBe(true);
  });

  test('filtre la liste publique et laisse l’admin tout voir', () => {
    const items = [activiteTous, activiteAnnuel];
    expect(filterActivitesForViewer(items, membre()).map((a) => a.nom)).toEqual(['Mission']);
    expect(
      filterActivitesForViewer(items, membre(), { includeRestricted: true }).map((a) => a.nom)
    ).toEqual(['Mission', 'Paiement Annuel']);
  });

  test('réserve les frais d’inscription aux nouveaux comptes EN_ATTENTE', () => {
    const nouveau = membre({ statut: 'EN_ATTENTE' });
    const existant = membre({ statut: 'VALIDE' });

    expect(canSeeActivite(nouveau, activiteInscription)).toBe(true);
    expect(canSeeActivite(nouveau, activiteTous)).toBe(false);
    expect(canSeeActivite(existant, activiteInscription)).toBe(false);
    expect(canSeeActivite(existant, activiteTous)).toBe(true);

    expect(() =>
      assertCanPayActivite({ acteur: nouveau, payeur: nouveau, activite: activiteInscription })
    ).not.toThrow();
    expect(() =>
      assertCanPayActivite({ acteur: existant, payeur: existant, activite: activiteInscription })
    ).toThrow(/nouveaux comptes/);
    expect(() =>
      assertCanPayActivite({ acteur: nouveau, payeur: nouveau, activite: activiteTous })
    ).toThrow(/inscription/);
  });

  test('interdit le paiement annuel hors officiers région, sauf admin', () => {
    expect(() =>
      assertCanPayActivite({ acteur: membre(), payeur: membre(), activite: activiteAnnuel })
    ).toThrow(/réservée/);

    expect(() =>
      assertCanPayActivite({
        acteur: membre({ isAdmin: true }),
        payeur: membre(),
        activite: activiteAnnuel,
      })
    ).not.toThrow();
  });
});
