const MPAYMENT_HOST = 'https://mpayment.orange-money.com';

export function isAppOrDeepLink(url) {
  const raw = String(url || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (!/^https?:\/\//i.test(raw)) return true;
  return /(?:^|[/.])maxit(?:[/.]|$)|max-it|intent:/i.test(lower);
}

/** URL renvoyée par Orange, sans reconstruire l’ancien /payment/pay_token mort. */
export function toWebPayCheckoutUrl(paymentUrl, payToken) {
  if (paymentUrl && /^https?:\/\//i.test(paymentUrl) && !isAppOrDeepLink(paymentUrl)) {
    return paymentUrl;
  }
  if (payToken) {
    return `${MPAYMENT_HOST}/sx/mpayment/abstract/${encodeURIComponent(payToken)}`;
  }
  return paymentUrl || null;
}

/**
 * Même page WebPay, servie sur notre domaine (/sx/...) pour :
 * - rester en navigation complète (cookies + code secret)
 * - ne pas déclencher Maxit
 */
export function toSameOriginCheckoutUrl(paymentUrl) {
  if (!paymentUrl || typeof window === 'undefined') return paymentUrl;
  if (paymentUrl.startsWith('/sx/') || paymentUrl.startsWith('/ci/')) {
    return paymentUrl;
  }
  try {
    const parsed = new URL(paymentUrl, window.location.origin);
    const host = parsed.hostname.toLowerCase();
    const isOrange =
      host === 'mpayment.orange-money.com' || host === 'webpayment.orange-money.com';
    if (!isOrange) return paymentUrl;
    if (!/^\/(sx|ci|dev)\/mpayment(\/|$)/i.test(parsed.pathname)) return paymentUrl;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return paymentUrl;
  }
}
