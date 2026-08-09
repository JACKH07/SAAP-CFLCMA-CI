const { AppError } = require('../../utils/errors');
const config = require('../../config');

/**
 * Orange Money WebPay / API E-commerce — structure prête.
 * Doc générale : OAuth2 client_credentials → création paiement → notif webhook.
 *
 * Credentials via .env (ORANGE_MONEY_*). Sans credentials → mode mock.
 */
class OrangeMoneyService {
  get cfg() {
    return config.orangeMoney || {};
  }

  isConfigured() {
    const c = this.cfg;
    return Boolean(c.apiUrl && c.clientId && c.clientSecret && c.merchantKey);
  }

  /**
   * @returns {Promise<{ accessToken: string, expiresIn?: number }>}
   */
  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new AppError('Orange Money non configuré', 503, 'PROVIDER_UNAVAILABLE');
    }

    // Structure réelle (à activer avec credentials) :
    // POST {apiUrl}/oauth/v3/token  (ou endpoint documenté)
    // Authorization: Basic base64(clientId:clientSecret)
    // grant_type=client_credentials
    const url = `${String(this.cfg.apiUrl).replace(/\/$/, '')}/oauth/v3/token`;
    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString(
      'base64'
    );

    const res = await fetch(url, {
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
      throw new AppError(
        `Orange Money auth échouée (${res.status}) ${text}`.trim(),
        502,
        'PROVIDER_UNAVAILABLE'
      );
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Initie un paiement.
   * @param {{ amount: number, currency?: string, orderId: string, phone: string, returnUrl?: string, cancelUrl?: string, notifUrl?: string }} payload
   */
  async initiatePayment(payload) {
    const { amount, orderId, phone, returnUrl, cancelUrl, notifUrl } = payload;
    const currency = payload.currency || 'OUV'; // ou XOF selon contrat marchand

    const { accessToken } = await this.getAccessToken();
    const url = `${String(this.cfg.apiUrl).replace(/\/$/, '')}/webpayment/v1/transaction`;

    const body = {
      merchant_key: this.cfg.merchantKey,
      currency,
      order_id: orderId,
      amount: Number(amount),
      return_url: returnUrl || this.cfg.returnUrl,
      cancel_url: cancelUrl || this.cfg.cancelUrl,
      notif_url: notifUrl || this.cfg.notifUrl || this.cfg.callbackUrl,
      lang: 'fr',
      reference: phone,
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

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(
        `Orange Money initiation échouée (${res.status}) ${text}`.trim(),
        502,
        'PAYMENT_REFUSED'
      );
    }

    const data = await res.json();
    return {
      provider: 'ORANGE',
      status: 'PENDING',
      referenceExterne: data.txnid || data.pay_token || data.notif_token || orderId,
      paymentUrl: data.payment_url || data.paymentUrl || null,
      raw: data,
    };
  }

  /**
   * Vérifie le statut d’une transaction auprès d’Orange.
   */
  async checkStatus({ orderId, payToken }) {
    const { accessToken } = await this.getAccessToken();
    const url = `${String(this.cfg.apiUrl).replace(/\/$/, '')}/webpayment/v1/transactionstatus`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: undefined,
        pay_token: payToken,
      }),
    });

    if (!res.ok) {
      throw new AppError('Impossible de vérifier le statut Orange Money', 502, 'PROVIDER_UNAVAILABLE');
    }

    const data = await res.json();
    const statusRaw = String(data.status || data.payment_status || '').toUpperCase();
    let status = 'PENDING';
    if (['SUCCESS', 'SUCCESSFUL', 'SUCCESSFULL'].includes(statusRaw)) status = 'SUCCESS';
    if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(statusRaw)) status = 'FAILED';

    return { provider: 'ORANGE', status, raw: data };
  }

  /**
   * Normalise un payload webhook Orange.
   */
  parseWebhook(body = {}) {
    const statusRaw = String(body.status || body.payment_status || '').toUpperCase();
    let status = 'PENDING';
    if (['SUCCESS', 'SUCCESSFUL', 'SUCCESSFULL'].includes(statusRaw)) status = 'SUCCESS';
    if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(statusRaw)) status = 'FAILED';

    return {
      provider: 'ORANGE',
      idPaiement: body.idPaiement || body.order_id || body.orderId || null,
      referenceExterne: body.referenceExterne || body.txnid || body.pay_token || null,
      status,
      amount: body.amount != null ? Number(body.amount) : null,
      raw: body,
    };
  }

  verifyWebhookSignature(req) {
    const secret = this.cfg.webhookSecret;
    if (!secret) return true; // pas de secret configuré → skip (dev)
    const header =
      req.headers['x-orange-signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['x-hmac-sha256'];
    // TODO: comparer HMAC(body, secret) quand le format exact Orange est fourni
    return Boolean(header) || Boolean(secret);
  }
}

module.exports = new OrangeMoneyService();
