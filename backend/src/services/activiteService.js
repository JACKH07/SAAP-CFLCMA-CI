const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const { filterActivitesForViewer } = require('../utils/activiteAccess');
const { normalizeVisibilite } = require('../constants/activiteVisibilite');
const { toPaymentSafeId } = require('../utils/text');

class ActiviteService {
  async list({ includeInactive = false, viewer = null, includeRestricted = false } = {}) {
    const items = await prisma.activite.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { nom: 'asc' },
      include: {
        _count: { select: { cotisations: true } },
      },
    });
    return filterActivitesForViewer(items, viewer, { includeRestricted });
  }

  async getById(id) {
    const activite = await prisma.activite.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { cotisations: true } } },
    });
    if (!activite) throw new AppError('Activité introuvable', 404);
    return activite;
  }

  async create({ nom, prefixeIdPaiement, montantDefaut, active = true, visibilite }) {
    if (!nom?.trim()) throw new AppError('Nom requis', 400);
    if (!prefixeIdPaiement?.trim()) throw new AppError('Préfixe ID paiement requis', 400);

    const prefixe = toPaymentSafeId(prefixeIdPaiement);
    if (!prefixe) throw new AppError('Préfixe ID paiement requis', 400);
    try {
      return await prisma.activite.create({
        data: {
          nom: nom.trim(),
          prefixeIdPaiement: prefixe,
          montantDefaut: montantDefaut === '' || montantDefaut == null ? null : Number(montantDefaut),
          visibilite: normalizeVisibilite(visibilite),
          active: Boolean(active),
        },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new AppError('Nom ou préfixe déjà utilisé', 409);
      }
      throw err;
    }
  }

  async update(id, payload) {
    await this.getById(id);
    const data = {};

    if (payload.nom !== undefined) {
      if (!String(payload.nom).trim()) throw new AppError('Nom invalide', 400);
      data.nom = String(payload.nom).trim();
    }
    if (payload.prefixeIdPaiement !== undefined) {
      if (!String(payload.prefixeIdPaiement).trim()) throw new AppError('Préfixe invalide', 400);
      data.prefixeIdPaiement = toPaymentSafeId(payload.prefixeIdPaiement);
      if (!data.prefixeIdPaiement) throw new AppError('Préfixe invalide', 400);
    }
    if (payload.montantDefaut !== undefined) {
      data.montantDefaut =
        payload.montantDefaut === '' || payload.montantDefaut == null
          ? null
          : Number(payload.montantDefaut);
    }
    if (payload.active !== undefined) {
      data.active = Boolean(payload.active);
    }
    if (payload.visibilite !== undefined) {
      data.visibilite = normalizeVisibilite(payload.visibilite);
    }

    try {
      return await prisma.activite.update({
        where: { id: Number(id) },
        data,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new AppError('Nom ou préfixe déjà utilisé', 409);
      }
      throw err;
    }
  }
}

module.exports = new ActiviteService();
