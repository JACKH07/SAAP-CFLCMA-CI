const { GRADE_DEFAULT } = require('../constants/grades');

/** Rôle organisationnel SAAP (Super Admin) */
const ROLE_COORDINATEUR_GENERAL = 'Coordinateur Général (CG)';

/** Grade par défaut à l'inscription si non choisi */
const ROLE_MEMBRES_ACTIFS = GRADE_DEFAULT;

/** @deprecated alias */
const ROLE_SECRETAIRE_GENERAL = ROLE_COORDINATEUR_GENERAL;

/** @deprecated alias */
const ROLE_MEMBRES = ROLE_MEMBRES_ACTIFS;

function hasAdminAccess(membre) {
  if (!membre) return false;
  if (membre.isSuperAdmin === true) return true;
  return membre.isAdmin === true;
}

function isSuperAdmin(membre) {
  return Boolean(membre?.isSuperAdmin);
}

function isCoordinateurGeneral(membre) {
  return membre?.role?.nom === ROLE_COORDINATEUR_GENERAL;
}

/** @deprecated alias */
function isSecretaireGeneral(membre) {
  return isCoordinateurGeneral(membre);
}

module.exports = {
  ROLE_COORDINATEUR_GENERAL,
  ROLE_MEMBRES_ACTIFS,
  ROLE_SECRETAIRE_GENERAL,
  ROLE_MEMBRES,
  GRADE_DEFAULT,
  hasAdminAccess,
  isSuperAdmin,
  isCoordinateurGeneral,
  isSecretaireGeneral,
};
