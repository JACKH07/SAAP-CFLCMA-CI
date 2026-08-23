const {
  rewriteOrangeLocation,
  rewriteOrangeHosts,
  isWebpayPath,
} = require('../../middlewares/orangeWebpayProxy');
const { toProxiedCheckoutPath } = require('../payment/orangeWebpayUrls');

describe('orange webpay proxy', () => {
  test('ne proxifie que /sx et /ci', () => {
    expect(isWebpayPath('/sx/mpayment/abstract/abc')).toBe(true);
    expect(isWebpayPath('/ci/mpayment/abstract/abc')).toBe(true);
    expect(isWebpayPath('/api/cotisations')).toBe(false);
    expect(isWebpayPath('/mes-cotisations')).toBe(false);
  });

  test('réécrit une redirection Orange en chemin local', () => {
    expect(
      rewriteOrangeLocation('https://mpayment.orange-money.com/sx/mpayment/confirm/abc')
    ).toBe('/sx/mpayment/confirm/abc');
  });

  test('laisse intacte une redirection vers notre site', () => {
    const back = 'https://cfl.flambeauxcmaci.com/mes-cotisations?paiement=ok';
    expect(rewriteOrangeLocation(back)).toBe(back);
  });

  test('réécrit les hôtes Orange dans le HTML', () => {
    expect(
      rewriteOrangeHosts('<script src="https://mpayment.orange-money.com/sx/mpayment/static/a.js">')
    ).toBe('<script src="/sx/mpayment/static/a.js">');
  });

  test('convertit payment_url en chemin proxifié', () => {
    expect(
      toProxiedCheckoutPath(
        'https://mpayment.orange-money.com/sx/mpayment/abstract/v1abcxyz'
      )
    ).toBe('/sx/mpayment/abstract/v1abcxyz');
  });

  test('expose la page WebPay sur le domaine du site', () => {
    const { toPublicCheckoutUrl } = require('../payment/orangeWebpayUrls');
    expect(
      toPublicCheckoutUrl(
        'https://mpayment.orange-money.com/sx/mpayment/abstract/v1abcxyz',
        'https://cfl.flambeauxcmaci.com'
      )
    ).toBe('https://cfl.flambeauxcmaci.com/sx/mpayment/abstract/v1abcxyz');
  });
});
