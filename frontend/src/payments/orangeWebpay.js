const WEBPAY_CHECKOUT_BASE = 'https://webpayment.orange-money.com/payment/pay_token';

export function isAppOrDeepLink(url) {
  const raw = String(url || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (!/^https?:\/\//i.test(raw)) return true;
  return /maxit|max-it|intent:/i.test(lower);
}

/** Page hébergée par Orange — pas l’application Maxit. */
export function toWebPayCheckoutUrl(paymentUrl, payToken) {
  if (payToken) {
    return `${WEBPAY_CHECKOUT_BASE}/${encodeURIComponent(payToken)}`;
  }
  if (paymentUrl && !isAppOrDeepLink(paymentUrl)) {
    return paymentUrl;
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
