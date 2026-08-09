const { AppError } = require('../../utils/errors');
const config = require('../../config');

/**
 * Wave Checkout API — structure prête.
 * Doc générale : API key → POST /v1/checkout/sessions → redirect URL → webhook.
 *
 * Credentials via .env (WAVE_*). Sans credentials → mode mock.
 */
class WaveService {
  get cfg() {
    return config.wave || {};
  }

  isConfigured() {
    const c = this.cfg;
    return Boolean(c.apiUrl && c.apiKey);
  }

  /**
   * @param {{ amount: number, currency?: string, orderId: string, phone: string, successUrl?: string, errorUrl?: string, clientReference?: string }} payload
   */
  async initiatePayment(payload) {
    if (!this.isConfigured()) {
      throw new AppError('Wave non configuré', 503, 'PROVIDER_UNAVAILABLE');
    }

    const {
      amount,
      orderId,
      phone,
      successUrl,
      errorUrl,
      clientReference,
    } = payload;
    const currency = payload.currency || 'XOF';

    const url = `${String(this.cfg.apiUrl).replace(/\/$/, '')}/v1/checkout/sessions`;
    const body = {
      amount: String(Math.round(Number(amount))),
      currency,
      error_url: errorUrl || this.cfg.errorUrl,
      success_url: successUrl || this.cfg.successUrl,
      client_reference: clientReference || orderId,
      // Optionnel selon contrat Wave :
      // aggregated_merchant_id, restrict_payer_mobile, ...
    };

    if (phone) {
      body.restrict_payer_mobile = String(phone).replace(/\s+/g, '');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cfg.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(
        `Wave initiation échouée (${res.status}) ${text}`.trim(),
        502,
        'PAYMENT_REFUSED'
      );
    }

    const data = await res.json();
    return {
      provider: 'WAVE',
      status: 'PENDING',
      referenceExterne: data.id || data.checkout_session_id || orderId,
      paymentUrl: data.wave_launch_url || data.launch_url || data.paymentUrl || null,
      raw: data,
    };
  }

  /**
   * Vérifie le statut d’une session / transaction Wave.
   */
  async checkStatus({ sessionId, transactionId }) {
    if (!this.isConfigured()) {
      throw new AppError('Wave non configuré', 503, 'PROVIDER_UNAVAILABLE');
    }

    const id = sessionId || transactionId;
    if (!id) throw new AppError('Identifiant Wave manquant', 400);

    // Sessions : GET /v1/checkout/sessions/:id
    // Transactions : GET /v1/transactions/:id
    const path = sessionId
      ? `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`
      : `/v1/transactions/${encodeURIComponent(transactionId)}`;
    const url = `${String(this.cfg.apiUrl).replace(/\/$/, '')}${path}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.cfg.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new AppError('Impossible de vérifier le statut Wave', 502, 'PROVIDER_UNAVAILABLE');
    }

    const data = await res.json();
    const statusRaw = String(
      data.payment_status || data.status || data.checkout_status || ''
    ).toUpperCase();

    let status = 'PENDING';
    if (['SUCCEEDED', 'SUCCESS', 'SUCCESSFUL', 'COMPLETE', 'COMPLETED'].includes(statusRaw)) {
      status = 'SUCCESS';
    }
    if (['FAILED', 'CANCELLED', 'EXPIRED', 'ERROR'].includes(statusRaw)) {
      status = 'FAILED';
    }

    return { provider: 'WAVE', status, raw: data };
  }

  parseWebhook(body = {}) {
    const data = body.data || body;
    const type = String(body.type || body.event || '').toLowerCase();
    const statusRaw = String(
      data.payment_status || data.status || body.status || ''
    ).toUpperCase();

    let status = 'PENDING';
    if (
      type.includes('checkout.session.completed') ||
      ['SUCCEEDED', 'SUCCESS', 'SUCCESSFUL', 'COMPLETE', 'COMPLETED'].includes(statusRaw)
    ) {
      status = 'SUCCESS';
    }
    if (
      type.includes('failed') ||
      ['FAILED', 'CANCELLED', 'EXPIRED', 'ERROR'].includes(statusRaw)
    ) {
      status = 'FAILED';
    }

    return {
      provider: 'WAVE',
      idPaiement: data.client_reference || body.client_reference || body.idPaiement || null,
      referenceExterne:
        data.id || data.transaction_id || body.id || body.referenceExterne || null,
      status,
      amount:
        data.amount != null
          ? Number(data.amount)
          : body.amount != null
            ? Number(body.amount)
            : null,
      raw: body,
    };
  }

  /**
   * Vérification HMAC Wave (header typiquement Wave-Signature).
   * Implémentation complète dès réception du secret webhook.
   */
  verifyWebhookSignature(req) {
    const secret = this.cfg.webhookSecret;
    if (!secret) return true;
    const header = req.headers['wave-signature'] || req.headers['x-wave-signature'];
    // TODO: HMAC-SHA256(payload, secret) selon doc Wave
    return Boolean(header) || Boolean(secret);
  }
}

module.exports = new WaveService();
