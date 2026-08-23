const { AppError } = require('../../utils/errors');
const config = require('../../config');
const {
  ORDER_ID_MAX_LENGTH,
  REFERENCE_MAX_LENGTH,
  clipOrangeField,
  extractNotifToken,
  extractPayToken,
  resolveCheckoutUrl,
} = require('./orangeWebpayUrls');

const SUCCESS_STATUSES = new Set(['SUCCESS', 'SUCCESSFUL', 'SUCCESSFULL', 'SUCCEEDED']);
const FAILED_STATUSES = new Set(['FAILED', 'EXPIRED', 'CANCELLED', 'CANCELED']);

function mapOrangeStatus(raw) {
  const statusRaw = String(raw || '').toUpperCase();
  if (SUCCESS_STATUSES.has(statusRaw)) return 'SUCCESS';
  if (FAILED_STATUSES.has(statusRaw)) return 'FAILED';
  return 'PENDING';
}

/**
 * Orange Money WebPay (OAuth + webpayment + transactionstatus).
 * Sandbox : /dev + devise OUV — Production CI : /ci + devise XOF.
 */
class OrangeMoneyService {
  constructor() {
    this._accessToken = null;
    this._tokenExpiresAt = 0;
  }

  get cfg() {
    return config.orangeMoney || {};
  }

  isConfigured() {
    const c = this.cfg;
    return Boolean(c.clientId && c.clientSecret && c.merchantKey);
  }

  webpayBaseUrl() {
    const api = String(this.cfg.apiUrl || 'https://api.orange.com/orange-money-webpay').replace(
      /\/$/,
      ''
    );
    const env = String(this.cfg.env || 'dev').toLowerCase();
    if (/\/(dev|ci)\/v1$/i.test(api)) return api;
    if (/\/(dev|ci)$/i.test(api)) return `${api}/v1`;
    return `${api}/${env}/v1`;
  }

  oauthUrl() {
    return String(this.cfg.oauthUrl || 'https://api.orange.com/oauth/v3/token').replace(/\/$/, '');
  }

  /**
   * @returns {Promise<{ accessToken: string, expiresIn?: number }>}
   */
  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new AppError('Orange Money non configuré', 503, 'PROVIDER_UNAVAILABLE');
    }

    if (this._accessToken && Date.now() < this._tokenExpiresAt) {
      return { accessToken: this._accessToken };
    }

    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString('base64');
    const res = await fetch(this.oauthUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this._accessToken = null;
      this._tokenExpiresAt = 0;
      throw new AppError(
        `Orange Money auth échouée (${res.status}) ${text}`.trim(),
        502,
        'PROVIDER_UNAVAILABLE'
      );
    }

    const data = await res.json();
    const expiresIn = Number(data.expires_in || 3600);
    this._accessToken = data.access_token;
    this._tokenExpiresAt = Date.now() + Math.max(30, expiresIn - 60) * 1000;

    return {
      accessToken: this._accessToken,
      expiresIn,
    };
  }

  /**
   * @param {{ amount: number, currency?: string, orderId: string, phone?: string, reference?: string, returnUrl?: string, cancelUrl?: string, notifUrl?: string }} payload
   */
  async initiatePayment(payload) {
    const { amount, orderId, reference, returnUrl, cancelUrl, notifUrl } = payload;
    const { accessToken } = await this.getAccessToken();
    const url = `${this.webpayBaseUrl()}/webpayment`;
    const currency = this.cfg.currency || 'OUV';

    const body = {
      merchant_key: this.cfg.merchantKey,
      currency,
      order_id: clipOrangeField(orderId, ORDER_ID_MAX_LENGTH),
      amount: Math.round(Number(amount)),
      return_url: returnUrl || this.cfg.returnUrl,
      cancel_url: cancelUrl || this.cfg.cancelUrl,
      notif_url: notifUrl || this.cfg.notifUrl || this.cfg.callbackUrl,
      lang: 'fr',
      reference: clipOrangeField(reference || 'CFLCMACI', REFERENCE_MAX_LENGTH),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text().catch(() => '');
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      let detail = text;
      try {
        const errBody = JSON.parse(text);
        if (errBody.code === 50 || /not authorized to access this URI/i.test(errBody.description || '')) {
          detail =
            'Orange Money sandbox uniquement pour le moment. Redéployez l’application : le serveur utilisera automatiquement /dev (pas /ci).';
        } else {
          detail = errBody.description || errBody.message || text;
        }
      } catch {
        // texte brut
      }
      throw new AppError(
        `Orange Money initiation échouée (${res.status}) ${detail}`.trim(),
        502,
        'PAYMENT_REFUSED'
      );
    }

    const payToken = extractPayToken(data);
    const notifToken = extractNotifToken(data);
    const paymentUrl = resolveCheckoutUrl(data, this.cfg.env);
    if (!paymentUrl) {
      throw new AppError(
        'Orange Money n’a pas renvoyé de lien WebPay (payment_url / pay_token). Vérifiez les clés marchand et ORANGE_MONEY_ENV=dev.',
        502,
        'PAYMENT_REFUSED'
      );
    }

    return {
      provider: 'ORANGE',
      status: 'PENDING',
      payToken,
      notifToken,
      referenceExterne: notifToken || payToken || data.txnid || orderId,
      paymentUrl,
      raw: data,
    };
  }

  /**
   * Vérifie le statut auprès d’Orange (order_id + amount + pay_token).
   */
  async checkStatus({ orderId, payToken, amount }) {
    if (!orderId || !payToken || amount == null) {
      throw new AppError(
        'Vérification Orange Money incomplète (order_id, amount, pay_token requis)',
        400
      );
    }

    const { accessToken } = await this.getAccessToken();
    const url = `${this.webpayBaseUrl()}/transactionstatus`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: Number(amount),
        pay_token: payToken,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(
        `Impossible de vérifier le statut Orange Money (${res.status}) ${text}`.trim(),
        502,
        'PROVIDER_UNAVAILABLE'
      );
    }

    const data = await res.json();
    return {
      provider: 'ORANGE',
      status: mapOrangeStatus(data.status || data.payment_status),
      raw: data,
    };
  }

  parseWebhook(body = {}) {
    return {
      provider: 'ORANGE',
      idPaiement: body.idPaiement || body.order_id || body.orderId || null,
      referenceExterne:
        body.referenceExterne ||
        body.notif_token ||
        body.txnid ||
        body.pay_token ||
        null,
      status: mapOrangeStatus(body.status || body.payment_status),
      amount: body.amount != null ? Number(body.amount) : null,
      raw: body,
    };
  }

  verifyWebhookSignature(req) {
    const secret = this.cfg.webhookSecret;
    if (!secret) return true;
    const header =
      req.headers['x-orange-signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['x-hmac-sha256'];
    return Boolean(header);
  }
}

module.exports = new OrangeMoneyService();
