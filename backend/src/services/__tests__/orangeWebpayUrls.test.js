const {
  MPAYMENT_HOST,
  isAppOrDeepLink,
  checkoutUrlFromPayToken,
  resolveCheckoutUrl,
  extractPayToken,
  clipOrangeField,
  REFERENCE_MAX_LENGTH,
} = require('../payment/orangeWebpayUrls');

describe('orangeWebpayUrls', () => {
  const payToken = 'v1gcdfxk0pdsfhmarekfwwj3unstmmplwulegmkafztsby7rptb6cknr';
  const orangeUrl = `${MPAYMENT_HOST}/sx/mpayment/abstract/${payToken}`;

  test('détecte les liens Maxit / deep link sans toucher à mpayment', () => {
    expect(isAppOrDeepLink('maxit://pay/abc')).toBe(true);
    expect(isAppOrDeepLink('intent://maxit.orange.ci#Intent;end')).toBe(true);
    expect(isAppOrDeepLink('https://maxit.orange.ci/pay/abc')).toBe(true);
    expect(isAppOrDeepLink(orangeUrl)).toBe(false);
    expect(isAppOrDeepLink('https://webpayment.orange-money.com/ci/mpayment/abstract/abc')).toBe(
      false
    );
  });

  test('fallback sandbox = /sx/mpayment/abstract', () => {
    expect(checkoutUrlFromPayToken(payToken, 'dev')).toBe(orangeUrl);
  });

  test('fallback prod CI = /ci/mpayment/abstract', () => {
    expect(checkoutUrlFromPayToken(payToken, 'ci')).toBe(
      `${MPAYMENT_HOST}/ci/mpayment/abstract/${payToken}`
    );
  });

  test('conserve la payment_url exacte renvoyée par Orange', () => {
    const url = resolveCheckoutUrl(
      {
        pay_token: payToken,
        payment_url: orangeUrl,
      },
      'dev'
    );
    expect(url).toBe(orangeUrl);
  });

  test('ne remplace pas une payment_url web d’un autre pays', () => {
    const raw = 'https://webpayment.orange-money.com/cm/mpayment/abstract/abc';
    expect(resolveCheckoutUrl({ pay_token: payToken, payment_url: raw }, 'dev')).toBe(raw);
  });

  test('remplace uniquement un deep link Maxit', () => {
    expect(
      resolveCheckoutUrl({ pay_token: payToken, payment_url: 'maxit://pay/abc' }, 'dev')
    ).toBe(orangeUrl);
  });

  test('extrait le pay_token imbriqué', () => {
    expect(extractPayToken({ data: { pay_token: payToken } })).toBe(payToken);
  });

  test('tronque la référence à 30 caractères', () => {
    expect(clipOrangeField('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456', REFERENCE_MAX_LENGTH)).toHaveLength(
      30
    );
  });

  test('retire les accents de la référence Orange Money', () => {
    expect(clipOrangeField('NGLIÈ-ELKO19980101', REFERENCE_MAX_LENGTH)).toBe('NGLIE-ELKO19980101');
  });
});
