const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const membreIdService = require('./membreIdService');
const auditService = require('./auditService');
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
        orderBy: { updatedAt: 'desc' },
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
          montant: activite.montantDefaut || paye,
          montantPaye: paye,
          statut: this.computeStatut(activite.montantDefaut || paye, paye),
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
          montantPaye: nouveauMontantPaye,
          statut: this.computeStatut(cotisation.montant, nouveauMontantPaye),
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
   * Initie un paiement mobile money (stub API — prêt pour intégration réelle).
   */
  async initiateMobileMoney({ membreId, activiteId, provider, phone }, acteurId) {
    const membre = await prisma.membre.findUnique({ where: { id: Number(membreId) } });
    if (!membre) throw new AppError('Membre introuvable', 404);

    // Un membre ne peut payer que pour lui-même (sauf admin — contrôlé en amont)
    const activite = await prisma.activite.findUnique({ where: { id: Number(activiteId) } });
    if (!activite) throw new AppError('Activité introuvable', 404);

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
          montant: activite.montantDefaut || 0,
          statut: 'EN_ATTENTE',
          modePaiement: 'MOBILE_MONEY',
          provider: provider || 'ORANGE',
          regionId: membre.regionId,
          districtId: membre.districtId,
          paroisseId: membre.paroisseId,
          communauteId: membre.communauteId,
        },
      });
    } else {
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          modePaiement: 'MOBILE_MONEY',
          provider: provider || cotisation.provider || 'ORANGE',
        },
      });
    }

    const reste = Number(cotisation.montant) - Number(cotisation.montantPaye);
    if (reste <= 0) throw new AppError('Cette cotisation est déjà soldée', 400);

    // Stub : en production, appeler Orange Money / MTN MoMo ici
    const referenceExterne = `MM-${Date.now()}-${cotisation.id}`;
    await prisma.cotisation.update({
      where: { id: cotisation.id },
      data: { referenceExterne },
    });

    await auditService.log({
      acteurId,
      action: 'INIT_MOBILE_MONEY',
      entite: 'Cotisation',
      entiteId: cotisation.id,
      details: { provider, phone, referenceExterne, montant: reste },
    });

    return {
      cotisationId: cotisation.id,
      idPaiement: cotisation.idPaiement,
      referenceExterne,
      montant: reste,
      provider: provider || 'ORANGE',
      status: 'PENDING',
      message:
        'Paiement mobile money initié. Le statut sera mis à jour via webhook de confirmation.',
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

    if (status === 'SUCCESS' || status === 'SUCCESSFUL') {
      const paye = amount != null ? Number(amount) : Number(cotisation.montant);
      const nouveauMontantPaye = Math.max(Number(cotisation.montantPaye), paye);
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: {
          montantPaye: nouveauMontantPaye,
          statut: this.computeStatut(cotisation.montant, nouveauMontantPaye),
          modePaiement: 'MOBILE_MONEY',
          provider: provider || cotisation.provider,
          datePaiement: new Date(),
        },
      });
    } else if (status === 'FAILED' || status === 'FAILED') {
      cotisation = await prisma.cotisation.update({
        where: { id: cotisation.id },
        data: { statut: 'ECHOUE' },
      });
    }

    await auditService.log({
      action: 'WEBHOOK_MOBILE_MONEY',
      entite: 'Cotisation',
      entiteId: cotisation.id,
      details: { status, amount, provider, idPaiement: cotisation.idPaiement },
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
