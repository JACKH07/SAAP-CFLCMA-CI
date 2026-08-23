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

export function chromeIntentUrl(httpsUrl) {
  try {
    const parsed = new URL(httpsUrl);
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`;
  } catch {
    return httpsUrl;
  }
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function redirectToOrangeCheckout(url) {
  if (!url || typeof window === 'undefined') return;
  window.location.assign(isAndroidDevice() ? chromeIntentUrl(url) : url);
}
