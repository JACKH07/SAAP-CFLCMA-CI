const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');

class ActiviteService {
  async list({ includeInactive = false } = {}) {
    return prisma.activite.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { nom: 'asc' },
      include: {
        _count: { select: { cotisations: true } },
      },
    });
  }

  async getById(id) {
    const activite = await prisma.activite.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { cotisations: true } } },
    });
    if (!activite) throw new AppError('Activité introuvable', 404);
    return activite;
  }

  async create({ nom, prefixeIdPaiement, montantDefaut, active = true }) {
    if (!nom?.trim()) throw new AppError('Nom requis', 400);
    if (!prefixeIdPaiement?.trim()) throw new AppError('Préfixe ID paiement requis', 400);

    const prefixe = prefixeIdPaiement.trim().toUpperCase();
    try {
      return await prisma.activite.create({
        data: {
          nom: nom.trim(),
          prefixeIdPaiement: prefixe,
          montantDefaut: montantDefaut === '' || montantDefaut == null ? null : Number(montantDefaut),
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
      data.prefixeIdPaiement = String(payload.prefixeIdPaiement).trim().toUpperCase();
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
