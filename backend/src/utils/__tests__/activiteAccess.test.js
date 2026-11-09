const {
  isOfficierRegion,
  canSeeActivite,
  assertCanPayActivite,
  filterActivitesForViewer,
} = require('../activiteAccess');

const activiteTous = { id: 1, nom: 'Mission', visibilite: 'TOUS' };
const activiteAnnuel = { id: 2, nom: 'Paiement Annuel', visibilite: 'REGION' };

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
