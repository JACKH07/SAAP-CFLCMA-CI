const {
  FRAIS_PAIEMENT_FCFA,
  montantCible,
  restantDu,
  assertMontantVersement,
  montantChargeMobileMoney,
} = require('../montantActivite');

const annuel = { nom: 'Paiement Annuel', montantDefaut: 150000 };
const libre = { nom: 'Mission', montantDefaut: 0 };

describe('montantActivite', () => {
  test('cible de 150 000 F pour le paiement annuel', () => {
    expect(montantCible(annuel)).toBe(150000);
    expect(montantCible(libre)).toBe(null);
  });

  test('autorise un versement unique ou plusieurs jusqu’au reste', () => {
    expect(restantDu(annuel, 0)).toBe(150000);
    expect(restantDu(annuel, 50000)).toBe(100000);
    expect(restantDu(annuel, 150000)).toBe(0);
    expect(assertMontantVersement(annuel, 0, 150000)).toBe(150000);
    expect(assertMontantVersement(annuel, 40000, 30000)).toBe(30000);
  });

  test('refuse un versement au-delà du reste dû', () => {
    expect(() => assertMontantVersement(annuel, 100000, 60000)).toThrow(/restant/);
    expect(() => assertMontantVersement(annuel, 150000, 1000)).toThrow(/soldée/);
  });

  test('ajoute 200 F de frais au montant débité en Mobile Money', () => {
    expect(FRAIS_PAIEMENT_FCFA).toBe(200);
    expect(montantChargeMobileMoney(150000)).toBe(150200);
    expect(montantChargeMobileMoney(1)).toBe(201);
    expect(montantChargeMobileMoney(0)).toBe(0);
  });
});
