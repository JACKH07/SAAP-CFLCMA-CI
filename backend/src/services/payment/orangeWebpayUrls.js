/** Page WebPay sandbox officielle (pas Maxit). */
const WEBPAY_CHECKOUT_BASE = 'https://webpayment.orange-money.com/payment/pay_token';

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

function isAppOrDeepLink(url) {
  const raw = String(url || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (!/^https?:\/\//i.test(raw)) return true;
  return /maxit|max-it|intent:/i.test(lower);
}

function checkoutUrlFromPayToken(payToken) {
  if (!payToken) return null;
  return `${WEBPAY_CHECKOUT_BASE}/${encodeURIComponent(String(payToken))}`;
}

/**
 * Sandbox (/dev) : toujours la page WebPay officielle.
 * Production CI : payment_url Orange si c’est une page web, sinon fallback pay_token.
 */
function resolveCheckoutUrl(data = {}, env = 'dev') {
  const payToken = extractPayToken(data);
  const raw = extractPaymentUrl(data);
  const official = checkoutUrlFromPayToken(payToken);

  if (String(env).toLowerCase() !== 'ci' && official) {
    return official;
  }
  if (raw && !isAppOrDeepLink(raw)) {
    return raw;
  }
  return official || raw || null;
}

function clipOrangeField(value, maxLength) {
  if (value == null) return value;
  const text = String(value);
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

module.exports = {
  WEBPAY_CHECKOUT_BASE,
  ORANGE_URL_MAX_LENGTH,
  ORDER_ID_MAX_LENGTH,
  REFERENCE_MAX_LENGTH,
  extractPaymentUrl,
  extractPayToken,
  extractNotifToken,
  isAppOrDeepLink,
  checkoutUrlFromPayToken,
  resolveCheckoutUrl,
  clipOrangeField,
};
