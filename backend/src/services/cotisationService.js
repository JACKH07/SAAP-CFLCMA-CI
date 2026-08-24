const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const membreIdService = require('./membreIdService');
const auditService = require('./auditService');
const paymentGateway = require('./payment');
const dashboardService = require('./dashboardService');
const {
  canPollProviderStatus,
  buildStatusCheckPayload,
  isTerminalPaymentStatus,
  SUCCESS_STATUSES,
} = require('./payment/pendingStatus');
const {
  resolveVersementIncrement,
  buildIdempotenceKey,
} = require('./payment/versementUtils');
const { assertCanPayActivite } = require('../utils/activiteAccess');
const { montantCible, assertMontantVersement } = require('../utils/montantActivite');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const REFERENCE_MAX_LENGTH = 100;

const VERSEMENTS_INCLUDE = {
  versements: { orderBy: { datePaiement: 'asc' } },
};

const COTISATION_MEMBRE_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  idMembre: true,
  contact: true,
};

const MEMBRE_ACCESS_INCLUDE = {
  role: { select: { nom: true, niveauHierarchique: true } },
  titre: { select: { nom: true, niveauHierarchique: true } },
};

function parsePaymentNotes(notes) {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // ancien format pending:1234
  }
  const match = String(notes).match(/^pending:(\d+(?:\.\d+)?)$/);
  return match ? { pendingAmount: Number(match[1]) } : {};
}

function clipReference(value) {
  if (!value) return null;
  const text = String(value);
  return text.length <= REFERENCE_MAX_LENGTH ? text : text.slice(0, REFERENCE_MAX_LENGTH);
}

function idPaiementFromOrangeOrderId(orderId) {
  if (!orderId) return null;
  const raw = String(orderId);
  const match = raw.match(/^(.*)-(\d{10,})$/);
  return match ? match[1] : raw;
}

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
        ...VERSEMENTS_INCLUDE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdmin(filters = {}) {
    const {
      page = 1,
      limit = 20,
      activite,
      activiteId,
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
    if (activiteId) where.activiteId = Number(activiteId);

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
            select: COTISATION_MEMBRE_SELECT,
          },
          region: { select: { id: true, nom: true } },
          district: { select: { id: true, nom: true } },
          ...VERSEMENTS_INCLUDE,
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
        membre: { select: COTISATION_MEMBRE_SELECT },
        region: true,
        district: true,
        paroisse: true,
        communaute: true,
        ...VERSEMENTS_INCLUDE,
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

  cotisationDetailInclude() {
    return {
      activite: true,
      membre: { select: COTISATION_MEMBRE_SELECT },
      ...VERSEMENTS_INCLUDE,
    };
  }

  async refreshCotisationTotals(id, extra = {}) {
    const sum = await prisma.versement.aggregate({
      where: { cotisationId: id },
      _sum: { montant: true },
    });
    const total = Number(sum._sum.montant || 0);
    const current = extra.activite
      ? { activite: extra.activite }
      : await prisma.cotisation.findUnique({
          where: { id },
          select: { activite: { select: { montantDefaut: true } } },
        });
    const cible = montantCible(current?.activite);
    const data = {
      montant: cible != null ? cible : total,
      montantPaye: total,
      statut:
        cible != null
          ? this.computeStatut(cible, total)
          : total > 0
            ? 'PAYE'
            : extra.fallbackStatut || 'EN_ATTENTE',
      datePaiement: total > 0 ? extra.datePaiement || new Date() : null,
    };
    if (extra.clearPendingNotes) data.notes = null;
    if (extra.provider) data.provider = extra.provider;
    if (extra.modePaiement) data.modePaiement = extra.modePaiement;
    if (extra.referenceExterne) {
      data.referenceExterne = clipReference(extra.referenceExterne);
    }
    return prisma.cotisation.update({
      where: { id },
      data,
      include: this.cotisationDetailInclude(),
    });
  }

  async addVersement(cotisation, payload) {
    const increment = resolveVersementIncrement({
      pendingAmount: payload.montant,
      amount: payload.amount,
    });
    if (!increment) {
      throw new AppError('Montant de versement invalide', 400);
    }

    const cleIdempotence = buildIdempotenceKey(cotisation.id, {
      orderId: payload.orderId,
      referenceExterne: payload.referenceExterne,
    });

    if (cleIdempotence) {
      const existing = await prisma.versement.findUnique({ where: { cleIdempotence } });
      if (existing) {
        return this.refreshCotisationTotals(cotisation.id, {
          clearPendingNotes: payload.clearPendingNotes !== false,
          provider: payload.provider,
          modePaiement: payload.modePaiement,
          referenceExterne: payload.referenceExterne,
        });
      }
    }

    try {
      await prisma.versement.create({
        data: {
          cotisationId: cotisation.id,
          montant: increment,
          modePaiement: payload.modePaiement || cotisation.modePaiement || 'MOBILE_MONEY',
          provider: payload.provider || cotisation.provider || null,
          referenceExterne: clipReference(payload.referenceExterne || cotisation.referenceExterne),
          cleIdempotence,
          datePaiement: payload.datePaiement || new Date(),
        },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        return this.refreshCotisationTotals(cotisation.id, {
          clearPendingNotes: payload.clearPendingNotes !== false,
        });
      }
      throw err;
    }

    return this.refreshCotisationTotals(cotisation.id, {
      clearPendingNotes: payload.clearPendingNotes !== false,
      provider: payload.provider,
      modePaiement: payload.modePaiement,
      referenceExterne: payload.referenceExterne,
      datePaiement: payload.datePaiement,
    });
  }

  /**
   * Reconstruit l’historique à partir des journaux d’audit (paiements écrasés).
   */
  async backfillVersementsFromAudit() {
    const cotisations = await prisma.cotisation.findMany({
      where: { montantPaye: { gt: 0 } },
      include: { _count: { select: { versements: true } } },
    });
    const toFill = cotisations.filter((c) => c._count.versements === 0);
    if (!toFill.length) return { created: 0, cotisations: 0 };

    let created = 0;
    for (const cotisation of toFill) {
      const logs = await prisma.auditLog.findMany({
        where: {
          entite: 'Cotisation',
          entiteId: String(cotisation.id),
          action: {
            in: [
              'PAIEMENT_MOBILE_MONEY_VALIDE',
              'WEBHOOK_MOBILE_MONEY',
              'SAISIE_PAIEMENT_MANUEL',
            ],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const lines = [];
      for (const log of logs) {
        const details = log.details || {};
        if (log.action === 'WEBHOOK_MOBILE_MONEY') {
          const status = String(details.status || '').toUpperCase();
          if (!SUCCESS_STATUSES.has(status)) continue;
        }
        const montant = Number(details.montant ?? details.montantPaye ?? details.amount);
        if (!Number.isFinite(montant) || montant <= 0) continue;

        const prev = lines[lines.length - 1];
        const at = new Date(log.createdAt);
        if (
          prev &&
          prev.montant === montant &&
          Math.abs(at.getTime() - prev.at.getTime()) < 15_000
        ) {
          continue;
        }

        lines.push({
          montant,
          unique: details.referenceExterne || details.orangeOrderId || null,
          at,
          provider: details.provider || cotisation.provider,
          mode:
            log.action === 'SAISIE_PAIEMENT_MANUEL'
              ? 'MANUEL'
              : cotisation.modePaiement || 'MOBILE_MONEY',
        });
      }

      if (!lines.length) {
        lines.push({
          montant: Number(cotisation.montantPaye),
          unique: cotisation.referenceExterne,
          at: cotisation.datePaiement || cotisation.updatedAt,
          provider: cotisation.provider,
          mode: cotisation.modePaiement || 'MOBILE_MONEY',
        });
      }

      for (const line of lines) {
        const cleIdempotence =
          buildIdempotenceKey(cotisation.id, {
            orderId: line.unique,
            referenceExterne: line.unique,
          }) || `${cotisation.id}:backfill:${line.at.getTime()}:${line.montant}`;
        try {
          await prisma.versement.create({
            data: {
              cotisationId: cotisation.id,
              montant: line.montant,
              modePaiement: line.mode,
              provider: line.provider || null,
              referenceExterne: clipReference(line.unique || cotisation.referenceExterne),
              cleIdempotence,
              datePaiement: line.at,
            },
          });
          created += 1;
        } catch (err) {
          if (err.code !== 'P2002') throw err;
        }
      }

      await this.refreshCotisationTotals(cotisation.id, { clearPendingNotes: false });
    }

    dashboardService.invalidateStatsCache();
    return { created, cotisations: toFill.length };
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

    const membre = await prisma.membre.findUnique({
      where: { id: Number(membreId) },
      include: MEMBRE_ACCESS_INCLUDE,
    });
    if (!membre) throw new AppError('Membre introuvable', 404);

    const activite = await prisma.activite.findUnique({ where: { id: Number(activiteId) } });
    if (!activite) throw new AppError('Activité introuvable', 404);

    const acteur = await prisma.membre.findUnique({
      where: { id: Number(acteurId) },
      include: MEMBRE_ACCESS_INCLUDE,
    });
    assertCanPayActivite({ acteur, payeur: membre, activite });

    const paye = Number(montantPaye);
    if (paye <= 0) throw new AppError('Montant invalide', 400);

    const idPaiement = membreIdService.buildPaymentId(
      activite.prefixeIdPaiement,
      membre.idMembre
    );

    let cotisation = await prisma.cotisation.findUnique({ where: { idPaiement } });
    assertMontantVersement(activite, cotisation?.montantPaye || 0, paye);

    const cible = montantCible(activite);

    if (!cotisation) {
      cotisation = await prisma.cotisation.create({
        data: {
          membreId: membre.id,
          activiteId: activite.id,
          idPaiement,
          montant: cible != null ? cible : 0,
          montantPaye: 0,
          statut: 'EN_ATTENTE',
          modePaiement: 'MANUEL',
          regionId: membre.regionId,
          districtId: membre.districtId,
          paroisseId: membre.paroisseId,
          communauteId: membre.communauteId,
          saisiParId: acteurId,
          justificatifUrl: justificatifUrl || null,
          notes: notes || null,
        },
      });
    } else {
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          saisiParId: acteurId,
          justificatifUrl: justificatifUrl || cotisation.justificatifUrl,
          notes: notes || cotisation.notes,
          modePaiement: 'MANUEL',
        },
      });
    }

    cotisation = await this.addVersement(cotisation, {
      montant: paye,
      modePaiement: 'MANUEL',
      datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
      clearPendingNotes: false,
      referenceExterne: `MANUEL-${Date.now()}-${paye}`,
    });

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

    dashboardService.invalidateStatsCache();
    return cotisation;
  }

  /**
   * Initie un paiement mobile money (Orange Money / Wave).
   * Montant libre, sauf activité à montant fixe (ex. Paiement Annuel 150 000 F),
   * payable en une ou plusieurs fois jusqu’au reste dû.
   */
  async initiateMobileMoney({ membreId, activiteId, provider, phone, montant }, acteurId) {
    const membre = await prisma.membre.findUnique({
      where: { id: Number(membreId) },
      include: MEMBRE_ACCESS_INCLUDE,
    });
    if (!membre) throw new AppError('Membre introuvable', 404);

    const activite = await prisma.activite.findUnique({ where: { id: Number(activiteId) } });
    if (!activite) throw new AppError('Activité introuvable', 404);

    const acteur = await prisma.membre.findUnique({
      where: { id: Number(acteurId) },
      include: MEMBRE_ACCESS_INCLUDE,
    });
    assertCanPayActivite({ acteur, payeur: membre, activite });

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
    assertMontantVersement(activite, cotisation?.montantPaye || 0, payAmount);
    const cible = montantCible(activite);

    if (!cotisation) {
      cotisation = await prisma.cotisation.create({
        data: {
          membreId: membre.id,
          activiteId: activite.id,
          idPaiement,
          montant: cible != null ? cible : payAmount,
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
    const orangeOrderId = `CFL${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`
      .toUpperCase()
      .slice(0, 30);

    let providerResult;
    try {
      providerResult = await paymentGateway.initiatePayment({
        provider: providerKey,
        amount: Math.round(payAmount),
        orderId: orangeOrderId,
        reference: idPaiement,
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
    const referenceExterne = clipReference(
      providerResult.referenceExterne || `MM-${Date.now()}-${cotisation.id}`
    );
    const pendingNotes = JSON.stringify({
      pendingAmount: payAmount,
      orangeOrderId,
      payToken: providerResult.payToken || null,
      notifToken: providerResult.notifToken || null,
      paymentUrl: providerResult.paymentUrl || null,
    });

    const include = this.cotisationDetailInclude();

    if (status === 'SUCCESS' || status === 'SUCCESSFUL') {
      cotisation = await this.addVersement(cotisation, {
        montant: payAmount,
        modePaiement: 'MOBILE_MONEY',
        provider: providerKey,
        referenceExterne,
        orderId: orangeOrderId,
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
          totalPaye: Number(cotisation.montantPaye),
          mock: Boolean(providerResult.mock),
        },
      });

      dashboardService.invalidateStatsCache();

      return {
        cotisationId: cotisation.id,
        idPaiement: cotisation.idPaiement,
        referenceExterne,
        montant: payAmount,
        totalPaye: Number(cotisation.montantPaye),
        provider: providerKey,
        status: 'SUCCESS',
        statut: 'PAYE',
        paymentUrl: providerResult.paymentUrl || null,
        payToken: providerResult.payToken || null,
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
        notes: pendingNotes,
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
        payToken: providerResult.payToken || null,
        mock: Boolean(providerResult.mock),
        message:
          providerResult.message ||
          `Paiement ${providerKey} initié. Confirmez sur la page Orange Money.`,
      cotisation,
    };
  }

  async findForWebhook({ idPaiement, referenceExterne }) {
    if (idPaiement) {
      const exact = await prisma.cotisation.findUnique({ where: { idPaiement } });
      if (exact) return exact;

      const resolved = idPaiementFromOrangeOrderId(idPaiement);
      if (resolved && resolved !== idPaiement) {
        const byPrefix = await prisma.cotisation.findUnique({ where: { idPaiement: resolved } });
        if (byPrefix) return byPrefix;
      }

      const byOrder = await prisma.cotisation.findFirst({
        where: { notes: { contains: `"orangeOrderId":"${idPaiement}"` } },
      });
      if (byOrder) return byOrder;
    }

    if (referenceExterne) {
      const byRef = await prisma.cotisation.findFirst({ where: { referenceExterne } });
      if (byRef) return byRef;

      const byNotes = await prisma.cotisation.findFirst({
        where: { notes: { contains: String(referenceExterne) } },
      });
      if (byNotes) return byNotes;
    }

    return null;
  }

  /**
   * Après retour WebPay : interroge transactionstatus puis confirme.
   */
  async verifyMobileMoney(idPaiement, acteur) {
    const cotisation = await prisma.cotisation.findUnique({ where: { idPaiement } });
    if (!cotisation) throw new AppError('Cotisation introuvable', 404);

    if (acteur && !acteur.isAdmin && cotisation.membreId !== acteur.id) {
      throw new AppError('Vous ne pouvez vérifier que votre propre paiement', 403);
    }

    const notes = parsePaymentNotes(cotisation.notes);
    if (cotisation.statut === 'PAYE' && notes.pendingAmount == null) return cotisation;

    const result = await paymentGateway.checkStatus(buildStatusCheckPayload(cotisation));
    if (!isTerminalPaymentStatus(result.status)) {
      return cotisation;
    }

    return this.confirmWebhook({
      idPaiement,
      referenceExterne: cotisation.referenceExterne,
      status: result.status,
      amount: notes.pendingAmount,
      provider: cotisation.provider || 'ORANGE',
    });
  }

  /**
   * Interroge Orange/Wave pour les cotisations encore en attente.
   */
  async syncPendingMobileMoney({ maxAgeMs, batchSize } = {}) {
    const maxAge = maxAgeMs ?? config.payment.statusPollMaxAgeMs;
    const take = batchSize ?? config.payment.statusPollBatchSize;
    const since = new Date(Date.now() - maxAge);

    const rows = await prisma.cotisation.findMany({
      where: {
        modePaiement: 'MOBILE_MONEY',
        notes: { not: null },
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'asc' },
      take,
    });

    let checked = 0;
    let updated = 0;

    for (const row of rows) {
      if (!canPollProviderStatus(row)) continue;
      checked += 1;
      try {
        const after = await this.verifyMobileMoney(row.idPaiement);
        if (
          after.statut !== row.statut ||
          Number(after.montantPaye) !== Number(row.montantPaye)
        ) {
          updated += 1;
        }
      } catch (err) {
        console.warn(`[payments] statut ${row.idPaiement} : ${err.message}`);
      }
    }

    return { checked, updated };
  }

  /**
   * Confirmation webhook mobile money.
   */
  async confirmWebhook({ idPaiement, referenceExterne, status, amount, provider }) {
    let cotisation = await this.findForWebhook({ idPaiement, referenceExterne });

    if (!cotisation) throw new AppError('Cotisation introuvable pour ce webhook', 404);

    const existingNotes = parsePaymentNotes(cotisation.notes);
    if (cotisation.statut === 'PAYE' && existingNotes.pendingAmount == null) {
      return cotisation;
    }

    const statusUp = String(status || '').toUpperCase();

    if (statusUp === 'SUCCESS' || statusUp === 'SUCCESSFUL' || statusUp === 'SUCCEEDED' || statusUp === 'SUCCESSFULL') {
      const increment = resolveVersementIncrement({
        pendingAmount: existingNotes.pendingAmount,
        amount,
      });
      if (!increment) {
        return cotisation;
      }
      cotisation = await this.addVersement(cotisation, {
        montant: increment,
        modePaiement: 'MOBILE_MONEY',
        provider: provider || cotisation.provider,
        referenceExterne: referenceExterne || cotisation.referenceExterne,
        orderId: existingNotes.orangeOrderId,
        clearPendingNotes: true,
      });
    } else if (statusUp === 'FAILED' || statusUp === 'CANCELLED' || statusUp === 'EXPIRED') {
      const dejaPaye = Number(cotisation.montantPaye || 0);
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          statut: dejaPaye > 0 ? this.computeStatut(cotisation.montant, dejaPaye) : 'ECHOUE',
          notes: null,
        },
        include: this.cotisationDetailInclude(),
      });
    }

    await auditService.log({
      action: 'WEBHOOK_MOBILE_MONEY',
      entite: 'Cotisation',
      entiteId: cotisation.id,
      details: { status: statusUp, amount, provider, idPaiement: cotisation.idPaiement },
    });

    dashboardService.invalidateStatsCache();
    return cotisation;
  }

  /**
   * Supprime un paiement / cotisation (admin uniquement).
   */
  async remove(id, acteurId, meta = {}) {
    const cotisationId = Number(id);
    const existing = await prisma.cotisation.findUnique({
      where: { id: cotisationId },
      include: {
        membre: { select: { id: true, nom: true, prenom: true, idMembre: true } },
        activite: { select: { id: true, nom: true } },
      },
    });
    if (!existing) throw new AppError('Paiement introuvable', 404);

    await prisma.cotisation.delete({ where: { id: cotisationId } });

    await auditService.log({
      acteurId,
      action: 'SUPPRESSION_PAIEMENT',
      entite: 'Cotisation',
      entiteId: cotisationId,
      details: {
        idPaiement: existing.idPaiement,
        montantPaye: existing.montantPaye,
        membreId: existing.membreId,
        idMembre: existing.membre?.idMembre,
        activite: existing.activite?.nom,
      },
      ipAddress: meta.ip,
    });

    dashboardService.invalidateStatsCache();
    return {
      id: cotisationId,
      idPaiement: existing.idPaiement,
      deleted: true,
    };
  }

  ensureUploadDir() {
    const dir = config.upload.dir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

module.exports = new CotisationService();
