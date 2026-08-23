/** Page checkout actuelle renvoyée par Orange (sandbox = /sx, prod CI = /ci). */
const MPAYMENT_HOST = 'https://mpayment.orange-money.com';

const ORANGE_URL_MAX_LENGTH = 120;
const ORDER_ID_MAX_LENGTH = 30;
const REFERENCE_MAX_LENGTH = 30;

function extractPaymentUrl(data = {}) {
  const nested = data.data && typeof data.data === 'object' ? data.data : {};
  return (
    data.payment_url ||
    data.paymentUrl ||
    data.pay_url ||
    data.payUrl ||
    nested.payment_url ||
    nested.paymentUrl ||
    nested.pay_url ||
    null
  );
}

function extractPayToken(data = {}) {
  const nested = data.data && typeof data.data === 'object' ? data.data : {};
  return data.pay_token || data.payToken || nested.pay_token || nested.payToken || null;
}

function extractNotifToken(data = {}) {
  const nested = data.data && typeof data.data === 'object' ? data.data : {};
  return data.notif_token || data.notifToken || nested.notif_token || nested.notifToken || null;
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function isAppOrDeepLink(url) {
  const raw = String(url || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (!isHttpUrl(raw)) return true;
  return /(?:^|[/.])maxit(?:[/.]|$)|max-it|intent:/i.test(lower);
}

function checkoutUrlFromPayToken(payToken, env = 'dev') {
  if (!payToken) return null;
  const country = String(env).toLowerCase() === 'ci' ? 'ci' : 'sx';
  return `${MPAYMENT_HOST}/${country}/mpayment/abstract/${encodeURIComponent(String(payToken))}`;
}

/**
 * Utilise toujours la payment_url d’Orange (ex. mpayment.orange-money.com/sx/...).
 * Ne reconstruit un fallback que si le lien est absent ou n’est pas une page web.
 */
function resolveCheckoutUrl(data = {}, env = 'dev') {
  const raw = extractPaymentUrl(data);
  if (raw && isHttpUrl(raw) && !isAppOrDeepLink(raw)) {
    return raw;
  }
  return checkoutUrlFromPayToken(extractPayToken(data), env) || raw || null;
}

function clipOrangeField(value, maxLength) {
  if (value == null) return value;
  const text = String(value);
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

module.exports = {
  MPAYMENT_HOST,
  ORANGE_URL_MAX_LENGTH,
  ORDER_ID_MAX_LENGTH,
  REFERENCE_MAX_LENGTH,
  extractPaymentUrl,
  extractPayToken,
  extractNotifToken,
  isHttpUrl,
  isAppOrDeepLink,
  checkoutUrlFromPayToken,
  resolveCheckoutUrl,
  clipOrangeField,
};
