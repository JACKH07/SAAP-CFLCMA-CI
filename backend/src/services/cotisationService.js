const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const membreIdService = require('./membreIdService');
const auditService = require('./auditService');
const paymentGateway = require('./payment');
const path = require('path');
const fs = require('fs');
const config = require('../config');

class CotisationService {
  async listMine(membreId) {
    return prisma.cotisation.findMany({
      where: { membreId: Number(membreId) },
      include: {
        activite: true,
        region: { select: { id: true, nom: true } },
        district: { select: { id: true, nom: true } },
        paroisse: { select: { id: true, nom: true } },
        communaute: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdmin(filters = {}) {
    const {
      page = 1,
      limit = 20,
      activite,
      regionId,
      districtId,
      paroisseId,
      communauteId,
      statut,
      search,
    } = filters;

    const where = {};
    if (statut) where.statut = statut;
    if (regionId) where.regionId = Number(regionId);
    if (districtId) where.districtId = Number(districtId);
    if (paroisseId) where.paroisseId = Number(paroisseId);
    if (communauteId) where.communauteId = Number(communauteId);

    if (activite) {
      where.activite = {
        OR: [
          { prefixeIdPaiement: activite },
          { nom: { contains: activite } },
        ],
      };
    }

    if (search) {
      where.OR = [
        { idPaiement: { contains: search } },
        { membre: { idMembre: { contains: search } } },
        { membre: { nom: { contains: search } } },
        { membre: { prenom: { contains: search } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      prisma.cotisation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ datePaiement: 'desc' }, { updatedAt: 'desc' }],
        include: {
          activite: true,
          membre: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              idMembre: true,
              contact: true,
            },
          },
          region: { select: { id: true, nom: true } },
          district: { select: { id: true, nom: true } },
        },
      }),
      prisma.cotisation.count({ where }),
    ]);

    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async findByPaymentId(idPaiement) {
    const cotisation = await prisma.cotisation.findUnique({
      where: { idPaiement },
      include: {
        activite: true,
        membre: { select: { id: true, nom: true, prenom: true, idMembre: true, contact: true } },
        region: true,
        district: true,
        paroisse: true,
        communaute: true,
      },
    });
    if (!cotisation) throw new AppError('Paiement introuvable', 404);
    return cotisation;
  }

  computeStatut(montant, montantPaye) {
    const m = Number(montant);
    const p = Number(montantPaye);
    if (p <= 0) return 'EN_ATTENTE';
    if (p >= m) return 'PAYE';
    return 'PARTIEL';
  }

  /**
   * Saisie manuelle d'un paiement (admin / coordinateur habilité).
   */
  async recordManualPayment(payload, acteurId, meta = {}) {
    const {
      membreId,
      activiteId,
      montantPaye,
      notes,
      justificatifUrl,
      datePaiement,
    } = payload;

    if (!membreId || !activiteId || montantPaye == null) {
      throw new AppError('membreId, activiteId et montantPaye sont requis', 400);
    }

    const membre = await prisma.membre.findUnique({ where: { id: Number(membreId) } });
    if (!membre) throw new AppError('Membre introuvable', 404);

    const activite = await prisma.activite.findUnique({ where: { id: Number(activiteId) } });
    if (!activite) throw new AppError('Activité introuvable', 404);

    const idPaiement = membreIdService.buildPaymentId(
      activite.prefixeIdPaiement,
      membre.idMembre
    );

    let cotisation = await prisma.cotisation.findUnique({ where: { idPaiement } });

    const paye = Number(montantPaye);
    if (paye < 0) throw new AppError('Montant invalide', 400);

    if (!cotisation) {
      cotisation = await prisma.cotisation.create({
        data: {
          membreId: membre.id,
          activiteId: activite.id,
          idPaiement,
          montant: paye,
          montantPaye: paye,
          statut: 'PAYE',
          modePaiement: 'MANUEL',
          datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
          regionId: membre.regionId,
          districtId: membre.districtId,
          paroisseId: membre.paroisseId,
          communauteId: membre.communauteId,
          saisiParId: acteurId,
          justificatifUrl: justificatifUrl || null,
          notes: notes || null,
        },
        include: { activite: true, membre: { select: { id: true, nom: true, prenom: true, idMembre: true } } },
      });
    } else {
      const nouveauMontantPaye = Number(cotisation.montantPaye) + paye;
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          montant: nouveauMontantPaye,
          montantPaye: nouveauMontantPaye,
          statut: 'PAYE',
          modePaiement: 'MANUEL',
          datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
          saisiParId: acteurId,
          justificatifUrl: justificatifUrl || cotisation.justificatifUrl,
          notes: notes || cotisation.notes,
        },
        include: { activite: true, membre: { select: { id: true, nom: true, prenom: true, idMembre: true } } },
      });
    }

    await auditService.log({
      acteurId,
      action: 'SAISIE_PAIEMENT_MANUEL',
      entite: 'Cotisation',
      entiteId: cotisation.id,
      details: {
        idPaiement: cotisation.idPaiement,
        montantPaye: paye,
        statut: cotisation.statut,
      },
      ipAddress: meta.ip,
    });

    return cotisation;
  }

  /**
   * Initie un paiement mobile money (Orange Money / Wave).
   * Le montant est libre (saisi par le membre) — pas de montant fixe d'activité.
   * En mode mock (sans credentials) : simulation succès/échec/attente selon PAYMENT_MOCK_RESULT.
   * Avec credentials : laisse EN_ATTENTE jusqu’au webhook / vérification statut.
   */
  async initiateMobileMoney({ membreId, activiteId, provider, phone, montant }, acteurId) {
    const membre = await prisma.membre.findUnique({ where: { id: Number(membreId) } });
    if (!membre) throw new AppError('Membre introuvable', 404);

    const activite = await prisma.activite.findUnique({ where: { id: Number(activiteId) } });
    if (!activite) throw new AppError('Activité introuvable', 404);

    const payAmount = Number(montant);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      throw new AppError('Indiquez un montant valide (FCFA)', 400);
    }

    if (!phone || String(phone).trim().length < 8) {
      throw new AppError('Numéro de téléphone requis pour le Mobile Money', 400);
    }

    const providerKey = paymentGateway.normalizeProvider(provider);
    const idPaiement = membreIdService.buildPaymentId(
      activite.prefixeIdPaiement,
      membre.idMembre
    );

    let cotisation = await prisma.cotisation.findUnique({ where: { idPaiement } });
    if (!cotisation) {
      cotisation = await prisma.cotisation.create({
        data: {
          membreId: membre.id,
          activiteId: activite.id,
          idPaiement,
          montant: payAmount,
          montantPaye: 0,
          statut: 'EN_ATTENTE',
          modePaiement: 'MOBILE_MONEY',
          provider: providerKey,
          regionId: membre.regionId,
          districtId: membre.districtId,
          paroisseId: membre.paroisseId,
          communauteId: membre.communauteId,
        },
      });
    }

    const dejaPaye = Number(cotisation.montantPaye || 0);
    const returnBase = config.urls.mesCotisations;
    const apiBase = String(config.urls.apiPublic || '').replace(/\/$/, '');

    let providerResult;
    try {
      providerResult = await paymentGateway.initiatePayment({
        provider: providerKey,
        amount: payAmount,
        orderId: idPaiement,
        phone: String(phone).trim(),
        returnUrl: `${returnBase}?paiement=ok&id=${encodeURIComponent(idPaiement)}`,
        cancelUrl: `${returnBase}?paiement=annule&id=${encodeURIComponent(idPaiement)}`,
        successUrl: `${returnBase}?paiement=ok&id=${encodeURIComponent(idPaiement)}`,
        errorUrl: `${returnBase}?paiement=echec&id=${encodeURIComponent(idPaiement)}`,
        notifUrl: `${apiBase}/cotisations/webhooks/${providerKey === 'WAVE' ? 'wave' : 'orange'}`,
      });
    } catch (err) {
      await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          statut: dejaPaye > 0 ? this.computeStatut(cotisation.montant, dejaPaye) : 'ECHOUE',
          provider: providerKey,
          modePaiement: 'MOBILE_MONEY',
        },
      });
      throw err;
    }

    const status = String(providerResult.status || 'PENDING').toUpperCase();
    const referenceExterne =
      providerResult.referenceExterne || `MM-${Date.now()}-${cotisation.id}`;

    const include = {
      activite: true,
      membre: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          idMembre: true,
          contact: true,
        },
      },
    };

    if (status === 'SUCCESS' || status === 'SUCCESSFUL') {
      const nouveauMontantPaye = dejaPaye + payAmount;
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          montant: nouveauMontantPaye,
          montantPaye: nouveauMontantPaye,
          statut: 'PAYE',
          modePaiement: 'MOBILE_MONEY',
          provider: providerKey,
          referenceExterne,
          datePaiement: new Date(),
        },
        include,
      });

      await auditService.log({
        acteurId,
        action: 'PAIEMENT_MOBILE_MONEY_VALIDE',
        entite: 'Cotisation',
        entiteId: cotisation.id,
        details: {
          provider: providerKey,
          phone,
          referenceExterne,
          montant: payAmount,
          totalPaye: nouveauMontantPaye,
          mock: Boolean(providerResult.mock),
        },
      });

      return {
        cotisationId: cotisation.id,
        idPaiement: cotisation.idPaiement,
        referenceExterne,
        montant: payAmount,
        totalPaye: nouveauMontantPaye,
        provider: providerKey,
        status: 'SUCCESS',
        statut: 'PAYE',
        paymentUrl: providerResult.paymentUrl || null,
        mock: Boolean(providerResult.mock),
        message:
          providerResult.message ||
          `Paiement de ${payAmount.toLocaleString('fr-FR')} FCFA validé pour ${activite.nom}.`,
        cotisation,
      };
    }

    if (status === 'FAILED') {
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          statut: dejaPaye > 0 ? this.computeStatut(cotisation.montant, dejaPaye) : 'ECHOUE',
          modePaiement: 'MOBILE_MONEY',
          provider: providerKey,
          referenceExterne,
        },
        include,
      });

      await auditService.log({
        acteurId,
        action: 'PAIEMENT_MOBILE_MONEY_ECHOUE',
        entite: 'Cotisation',
        entiteId: cotisation.id,
        details: { provider: providerKey, phone, referenceExterne, montant: payAmount },
      });

      throw new AppError(
        providerResult.message || 'Paiement refusé par l’opérateur',
        402,
        'PAYMENT_REFUSED'
      );
    }

    // PENDING — en attente webhook / confirmation opérateur
    cotisation = await prisma.cotisation.update({
      where: { id: cotisation.id },
      data: {
        statut: dejaPaye > 0 ? this.computeStatut(cotisation.montant, dejaPaye) : 'EN_ATTENTE',
        modePaiement: 'MOBILE_MONEY',
        provider: providerKey,
        referenceExterne,
        // conserve le montant attendu du versement en cours côté notes
        notes: `pending:${payAmount}`,
      },
      include,
    });

    await auditService.log({
      acteurId,
      action: 'PAIEMENT_MOBILE_MONEY_INITIE',
      entite: 'Cotisation',
      entiteId: cotisation.id,
      details: {
        provider: providerKey,
        phone,
        referenceExterne,
        montant: payAmount,
        mock: Boolean(providerResult.mock),
      },
    });

    return {
      cotisationId: cotisation.id,
      idPaiement: cotisation.idPaiement,
      referenceExterne,
      montant: payAmount,
      totalPaye: dejaPaye,
      provider: providerKey,
      status: 'PENDING',
      statut: cotisation.statut,
      paymentUrl: providerResult.paymentUrl || null,
      mock: Boolean(providerResult.mock),
      message:
        providerResult.message ||
        `Paiement ${providerKey} initié. Confirmez sur votre téléphone.`,
      cotisation,
    };
  }

  /**
   * Confirmation webhook mobile money.
   */
  async confirmWebhook({ idPaiement, referenceExterne, status, amount, provider }) {
    let cotisation = null;
    if (idPaiement) {
      cotisation = await prisma.cotisation.findUnique({ where: { idPaiement } });
    } else if (referenceExterne) {
      cotisation = await prisma.cotisation.findFirst({ where: { referenceExterne } });
    }

    if (!cotisation) throw new AppError('Cotisation introuvable pour ce webhook', 404);

    const statusUp = String(status || '').toUpperCase();

    if (statusUp === 'SUCCESS' || statusUp === 'SUCCESSFUL' || statusUp === 'SUCCEEDED') {
      const dejaPaye = Number(cotisation.montantPaye || 0);
      let payAmount =
        amount != null
          ? Number(amount)
          : (() => {
              const m = String(cotisation.notes || '').match(/^pending:(\d+(?:\.\d+)?)$/);
              return m ? Number(m[1]) : Number(cotisation.montant) - dejaPaye;
            })();
      if (!Number.isFinite(payAmount) || payAmount <= 0) {
        payAmount = Number(cotisation.montant) || 0;
      }
      const nouveauMontantPaye = dejaPaye + (amount != null ? Math.max(0, payAmount - dejaPaye) : payAmount);
      // Si amount = total payé côté opérateur, on prend max ; sinon cumul du pending
      const finalPaye =
        amount != null && Number(amount) >= dejaPaye
          ? Math.max(dejaPaye, Number(amount))
          : Math.max(dejaPaye, nouveauMontantPaye);

      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          montant: Math.max(Number(cotisation.montant), finalPaye),
          montantPaye: finalPaye,
          statut: 'PAYE',
          modePaiement: 'MOBILE_MONEY',
          provider: provider || cotisation.provider,
          referenceExterne: referenceExterne || cotisation.referenceExterne,
          datePaiement: new Date(),
          notes: null,
        },
      });
    } else if (statusUp === 'FAILED' || statusUp === 'CANCELLED' || statusUp === 'EXPIRED') {
      const dejaPaye = Number(cotisation.montantPaye || 0);
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          statut: dejaPaye > 0 ? this.computeStatut(cotisation.montant, dejaPaye) : 'ECHOUE',
          notes: null,
        },
      });
    }

    await auditService.log({
      action: 'WEBHOOK_MOBILE_MONEY',
      entite: 'Cotisation',
      entiteId: cotisation.id,
      details: { status: statusUp, amount, provider, idPaiement: cotisation.idPaiement },
    });

    return cotisation;
  }

  ensureUploadDir() {
    const dir = path.resolve(config.upload.dir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

module.exports = new CotisationService();
