const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

const ORANGE_WEBPAY_ORIGIN = 'https://mpayment.orange-money.com';

function rewriteOrangeLocation(location) {
  try {
    const parsed = new URL(location, ORANGE_WEBPAY_ORIGIN);
    if (!/(^|\.)orange-money\.com$/i.test(parsed.hostname)) return location;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return location;
  }
}

function rewriteOrangeHosts(text) {
  return String(text)
    .replace(/https?:\/\/mpayment\.orange-money\.com/gi, '')
    .replace(/https?:\/\/webpayment\.orange-money\.com/gi, '');
}

function isWebpayPath(pathname) {
  return /^\/(sx|ci)(\/|$)/i.test(pathname);
}

function createOrangeWebpayProxy() {
  return createProxyMiddleware({
    target: ORANGE_WEBPAY_ORIGIN,
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: '',
    pathFilter: isWebpayPath,
    selfHandleResponse: true,
    on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const location = proxyRes.headers.location;
        if (location) {
          res.setHeader('location', rewriteOrangeLocation(location));
        }

        const contentType = String(proxyRes.headers['content-type'] || '');
        if (
          contentType.includes('text/html') ||
          contentType.includes('javascript') ||
          contentType.includes('json')
        ) {
          return rewriteOrangeHosts(responseBuffer.toString('utf8'));
        }
        return responseBuffer;
      }),
    },
  });
}

module.exports = {
  ORANGE_WEBPAY_ORIGIN,
  rewriteOrangeLocation,
  rewriteOrangeHosts,
  isWebpayPath,
  createOrangeWebpayProxy,
};
