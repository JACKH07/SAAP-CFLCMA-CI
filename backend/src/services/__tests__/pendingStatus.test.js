const {
  isTerminalPaymentStatus,
  canPollProviderStatus,
  buildStatusCheckPayload,
} = require('../payment/pendingStatus');

describe('pendingStatus', () => {
  test('détecte un statut opérateur final', () => {
    expect(isTerminalPaymentStatus('SUCCESS')).toBe(true);
    expect(isTerminalPaymentStatus('failed')).toBe(true);
    expect(isTerminalPaymentStatus('PENDING')).toBe(false);
    expect(isTerminalPaymentStatus('')).toBe(false);
  });

  test('ne poll que les paiements mobile money en attente avec jetons', () => {
    const pending = {
      statut: 'EN_ATTENTE',
      modePaiement: 'MOBILE_MONEY',
      provider: 'ORANGE',
      idPaiement: 'SOC-ABC',
      referenceExterne: 'tok-1',
      notes: JSON.stringify({
        pendingAmount: 10,
        orangeOrderId: 'CFLABC',
        payToken: 'tok-1',
      }),
    };
    expect(canPollProviderStatus(pending)).toBe(true);
    expect(canPollProviderStatus({ ...pending, statut: 'PAYE' })).toBe(false);
    expect(canPollProviderStatus({ ...pending, notes: null, referenceExterne: null })).toBe(
      false
    );
  });

  test('construit la charge utile Orange et Wave', () => {
    expect(
      buildStatusCheckPayload({
        provider: 'ORANGE',
        idPaiement: 'SOC-ABC',
        referenceExterne: 'tok-1',
        notes: JSON.stringify({
          pendingAmount: 10,
          orangeOrderId: 'CFLABC',
          payToken: 'tok-1',
        }),
      })
    ).toEqual({
      provider: 'ORANGE',
      orderId: 'CFLABC',
      payToken: 'tok-1',
      amount: 10,
    });

    expect(
      buildStatusCheckPayload({
        provider: 'WAVE',
        referenceExterne: 'sess-9',
        notes: null,
      })
    ).toEqual({
      provider: 'WAVE',
      sessionId: 'sess-9',
      transactionId: undefined,
    });
  });
});
