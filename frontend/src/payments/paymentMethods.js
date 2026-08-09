/**
 * Catalogue des moyens de paiement (extensible : MTN MoMo, etc.).
 * Les logos sont servis depuis /public.
 */
export const PAYMENT_METHODS = [
  {
    id: 'ORANGE',
    name: 'Orange Money',
    shortName: 'Orange',
    logo: '/orange-money.png',
    logoBg: '#000000',
    accent: '#ff7900',
    enabled: true,
  },
  {
    id: 'WAVE',
    name: 'Wave',
    shortName: 'Wave',
    logo: '/wave.png',
    logoBg: '#1BA7FF',
    accent: '#1BA7FF',
    enabled: true,
  },
  // Prêt pour plus tard :
  // {
  //   id: 'MTN',
  //   name: 'MTN MoMo',
  //   shortName: 'MTN',
  //   logo: '/mtn-momo.png',
  //   logoBg: '#FFCC00',
  //   accent: '#FFCC00',
  //   enabled: false,
  // },
];

export function getPaymentMethod(id) {
  return PAYMENT_METHODS.find((m) => m.id === id) || null;
}

export function enabledPaymentMethods() {
  return PAYMENT_METHODS.filter((m) => m.enabled);
}
