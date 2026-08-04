const prisma = require('../config/prisma');
const { normalizeText } = require('../utils/text');

/**
 * Service d'autocomplétion / création de lieux (paroisses, communautés).
 * Recherche insensible à la casse et aux accents.
 */
class LieuAutocompleteService {
  /**
   * Recherche de paroisses par préfixe normalisé.
   */
  async searchParoisses(search, { districtId = null, limit = 15 } = {}) {
    const q = normalizeText(search);
    const where = {};
    if (districtId) {
      where.districtId = Number(districtId);
    }

    // Sans texte : lister les paroisses du district (sélection formulaire)
    if (q.length < 1) {
      if (!districtId) return [];
      return prisma.paroisse.findMany({
        where,
        take: Math.max(limit, 100),
        orderBy: { nom: 'asc' },
        include: {
          district: {
            select: { id: true, nom: true, regionId: true },
          },
        },
      });
    }

    where.nomNormalise = { contains: q };

    return prisma.paroisse.findMany({
      where,
      take: limit,
      orderBy: { nom: 'asc' },
      include: {
        district: {
          select: { id: true, nom: true, regionId: true },
        },
      },
    });
  }

  /**
   * Recherche de communautés par préfixe normalisé.
   */
  async searchCommunautes(search, { paroisseId = null, limit = 15 } = {}) {
    const q = normalizeText(search);
    if (q.length < 1) return [];

    const where = {
      nomNormalise: { contains: q },
    };
    if (paroisseId) {
      where.paroisseId = Number(paroisseId);
    }

    return prisma.communaute.findMany({
      where,
      take: limit,
      orderBy: { nom: 'asc' },
      include: {
        paroisse: {
          select: { id: true, nom: true, districtId: true },
        },
      },
    });
  }

  /**
   * Trouve ou crée une paroisse (dédoublonnage sur nom normalisé + district).
   */
  async findOrCreateParoisse(nom, districtId) {
    const trimmed = (nom || '').trim();
    if (!trimmed) {
      throw new Error('Le nom de la paroisse est requis');
    }
    if (!districtId) {
      throw new Error('Le district est requis pour créer une paroisse');
    }

    const nomNormalise = normalizeText(trimmed);

    const existing = await prisma.paroisse.findFirst({
      where: { districtId: Number(districtId), nomNormalise },
    });

    if (existing) return { paroisse: existing, created: false };

    const paroisse = await prisma.paroisse.create({
      data: {
        nom: trimmed,
        nomNormalise,
        districtId: Number(districtId),
      },
    });

    return { paroisse, created: true };
  }

  /**
   * Trouve ou crée une communauté (dédoublonnage sur nom normalisé + paroisse).
   */
  async findOrCreateCommunaute(nom, paroisseId) {
    const trimmed = (nom || '').trim();
    if (!trimmed) {
      throw new Error('Le nom de la communauté est requis');
    }
    if (!paroisseId) {
      throw new Error('La paroisse est requise pour créer une communauté');
    }

    const nomNormalise = normalizeText(trimmed);

    const existing = await prisma.communaute.findFirst({
      where: { paroisseId: Number(paroisseId), nomNormalise },
    });

    if (existing) return { communaute: existing, created: false };

    const communaute = await prisma.communaute.create({
      data: {
        nom: trimmed,
        nomNormalise,
        paroisseId: Number(paroisseId),
      },
    });

    return { communaute, created: true };
  }
}

module.exports = new LieuAutocompleteService();
