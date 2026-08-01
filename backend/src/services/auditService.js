const prisma = require('../config/prisma');

class AuditService {
  async log({ acteurId, action, entite, entiteId, details, ipAddress }) {
    return prisma.auditLog.create({
      data: {
        acteurId: acteurId || null,
        action,
        entite,
        entiteId: entiteId != null ? String(entiteId) : null,
        details: details || undefined,
        ipAddress: ipAddress || null,
      },
    });
  }

  async list({ page = 1, limit = 50, entite, acteurId } = {}) {
    const skip = (page - 1) * limit;
    const where = {};
    if (entite) where.entite = entite;
    if (acteurId) where.acteurId = Number(acteurId);

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          acteur: {
            select: { id: true, nom: true, prenom: true, idMembre: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

module.exports = new AuditService();
