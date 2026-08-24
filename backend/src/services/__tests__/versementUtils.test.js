const {
  resolveVersementIncrement,
  buildIdempotenceKey,
} = require('../payment/versementUtils');

describe('versementUtils', () => {
  test('ajoute le montant du versement, sans remplacer le total déjà payé', () => {
    expect(resolveVersementIncrement({ pendingAmount: 5000, amount: 5000 })).toBe(5000);
    expect(resolveVersementIncrement({ pendingAmount: 2000, amount: 7000 })).toBe(2000);
    expect(resolveVersementIncrement({ amount: 5000 })).toBe(5000);
    expect(resolveVersementIncrement({})).toBe(0);
  });

  test('clé d’idempotence par cotisation + ordre Orange', () => {
    expect(buildIdempotenceKey(12, { orderId: 'CFLABC' })).toBe('12:CFLABC');
    expect(buildIdempotenceKey(12, { referenceExterne: 'tok-1' })).toBe('12:tok-1');
    expect(buildIdempotenceKey(12, {})).toBe(null);
  });
});
