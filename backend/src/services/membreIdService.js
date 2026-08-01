const prisma = require('../config/prisma');
const { extractLetters, formatDateCompact } = require('../utils/text');

/**
 * Service de génération d'identifiants membres.
 * Règle : 2 lettres nom + 2 lettres prénom + date (AAAAMMJJ)
 * Collisions : suffixe numérique incrémental (-2, -3, ...)
 */
class MembreIdService {
  /**
   * Génère la base de l'ID sans suffixe de collision.
   * @param {string} nom
   * @param {string} prenom
   * @param {Date|string} dateNaissance
   * @returns {string} ex. KOJA19950312
   */
  buildBaseId(nom, prenom, dateNaissance) {
    const nomPart = extractLetters(nom, 2);
    const prenomPart = extractLetters(prenom, 2);
    const datePart = formatDateCompact(dateNaissance);
    return `${nomPart}${prenomPart}${datePart}`;
  }

  /**
   * Construit l'id_paiement : PREFIXE-ID_MEMBRE
   */
  buildPaymentId(prefixe, idMembre) {
    return `${prefixe}-${idMembre}`;
  }

  /**
   * Génère un id_membre unique, en gérant les collisions.
   * @returns {{ idMembre: string, collision: boolean, baseId: string, suffix: number|null }}
   */
  async generateUniqueId(nom, prenom, dateNaissance) {
    const baseId = this.buildBaseId(nom, prenom, dateNaissance);
    const existing = await prisma.membre.findMany({
      where: {
        OR: [
          { idMembre: baseId },
          { idMembre: { startsWith: `${baseId}-` } },
        ],
      },
      select: { idMembre: true },
    });

    if (existing.length === 0) {
      return { idMembre: baseId, collision: false, baseId, suffix: null };
    }

    const used = new Set(existing.map((m) => m.idMembre));
    let suffix = 2;
    let candidate = `${baseId}-${suffix}`;

    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${baseId}-${suffix}`;
    }

    return {
      idMembre: candidate,
      collision: true,
      baseId,
      suffix,
    };
  }

  /**
   * Notifie l'admin/coordinateur en charge (audit log pour l'instant).
   */
  async notifyCollision({ idMembre, baseId, suffix, inscritParId = null }) {
    await prisma.auditLog.create({
      data: {
        acteurId: inscritParId,
        action: 'COLLISION_ID_MEMBRE',
        entite: 'Membre',
        entiteId: idMembre,
        details: {
          message: `Collision détectée sur ${baseId}, ID attribué : ${idMembre}`,
          baseId,
          suffix,
        },
      },
    });
  }
}

module.exports = new MembreIdService();
