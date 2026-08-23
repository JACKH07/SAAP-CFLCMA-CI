const {
  WEBPAY_CHECKOUT_BASE,
  isAppOrDeepLink,
  checkoutUrlFromPayToken,
  resolveCheckoutUrl,
  extractPayToken,
  clipOrangeField,
  REFERENCE_MAX_LENGTH,
} = require('../payment/orangeWebpayUrls');

describe('orangeWebpayUrls', () => {
  const payToken = 'f5720dd906203c62033ffe64ed75614785878b0ab2231d9c582b2908fca0ab9a';

  test('détecte les liens Maxit / deep link', () => {
    expect(isAppOrDeepLink('maxit://pay/abc')).toBe(true);
    expect(isAppOrDeepLink('intent://maxit.orange.ci#Intent;end')).toBe(true);
    expect(isAppOrDeepLink('https://maxit.orange.ci/pay/abc')).toBe(true);
    expect(isAppOrDeepLink('https://webpayment.orange-money.com/payment/pay_token/abc')).toBe(
      false
    );
  });

  test('construit la page WebPay officielle depuis le pay_token', () => {
    expect(checkoutUrlFromPayToken(payToken)).toBe(`${WEBPAY_CHECKOUT_BASE}/${payToken}`);
  });

  test('sandbox ignore un lien Maxit et utilise /payment/pay_token', () => {
    const url = resolveCheckoutUrl(
      {
        pay_token: payToken,
        payment_url: 'https://maxit.orange.ci/session/xyz',
      },
      'dev'
    );
    expect(url).toBe(`${WEBPAY_CHECKOUT_BASE}/${payToken}`);
  });

  test('sandbox reconstruit l’URL même si payment_url est déjà WebPay', () => {
    const url = resolveCheckoutUrl(
      {
        pay_token: payToken,
        payment_url: 'https://webpayment.orange-money.com/ci/mpayment/abc',
      },
      'dev'
    );
    expect(url).toBe(`${WEBPAY_CHECKOUT_BASE}/${payToken}`);
  });

  test('production CI conserve une payment_url web', () => {
    const raw = 'https://webpayment.orange-money.com/ci/mpayment/abc';
    expect(resolveCheckoutUrl({ pay_token: payToken, payment_url: raw }, 'ci')).toBe(raw);
  });

  test('production CI remplace un deep link Maxit', () => {
    expect(
      resolveCheckoutUrl(
        { pay_token: payToken, payment_url: 'maxit://pay/abc' },
        'ci'
      )
    ).toBe(`${WEBPAY_CHECKOUT_BASE}/${payToken}`);
  });

  test('extrait le pay_token imbriqué', () => {
    expect(extractPayToken({ data: { pay_token: payToken } })).toBe(payToken);
  });

  test('tronque la référence à 30 caractères', () => {
    expect(clipOrangeField('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456', REFERENCE_MAX_LENGTH)).toHaveLength(
      30
    );
  });
});
