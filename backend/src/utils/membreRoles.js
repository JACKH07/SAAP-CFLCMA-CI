const prisma = require('../config/prisma');
const { AppError } = require('./errors');
const { TITRE_MAX_NIVEAU } = require('../constants/grades');
const { ROLE_MEMBRES_ACTIFS } = require('./roles');

function isEmptyId(value) {
  return value === undefined || value === null || value === '';
}

/**
 * Titre (CG/CDR/CDD/CDP) et grade sont indépendants.
 * roleId / fonctionId = grade ; titreId = titre de coordination.
 */
async function resolveMembreRoles({ roleId, fonctionId, titreId } = {}) {
  const defaultGrade = await prisma.role.findUnique({ where: { nom: ROLE_MEMBRES_ACTIFS } });
  if (!defaultGrade) {
    throw new AppError('Grade par défaut non configuré (SP)', 500);
  }

  let gradeId = defaultGrade.id;
  let finalTitreId = null;

  const rawGrade = !isEmptyId(roleId) ? roleId : fonctionId;
  if (!isEmptyId(rawGrade)) {
    const role = await prisma.role.findUnique({ where: { id: Number(rawGrade) } });
    if (!role) throw new AppError('Grade introuvable', 400);
    if (role.niveauHierarchique <= TITRE_MAX_NIVEAU) {
      finalTitreId = role.id;
    } else {
      gradeId = role.id;
    }
  }

  if (!isEmptyId(titreId)) {
    const titre = await prisma.role.findUnique({ where: { id: Number(titreId) } });
    if (!titre || titre.niveauHierarchique > TITRE_MAX_NIVEAU) {
      throw new AppError('Titre invalide', 400);
    }
    finalTitreId = titre.id;
  }

  return {
    roleId: Number(gradeId),
    titreId: finalTitreId ? Number(finalTitreId) : null,
  };
}

module.exports = { resolveMembreRoles, isEmptyId };
