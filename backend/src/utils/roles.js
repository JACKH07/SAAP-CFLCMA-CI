/** Rôle organisationnel (mouvement) — distinct des droits SAAP admin */
const ROLE_COORDINATEUR_GENERAL = 'Coordinateur général (C.G.)';

/** Membre simple du mouvement (sans mandat) */
const ROLE_MEMBRES_ACTIFS = 'Membres actifs';

/** @deprecated alias — utiliser ROLE_COORDINATEUR_GENERAL */
const ROLE_SECRETAIRE_GENERAL = ROLE_COORDINATEUR_GENERAL;

/** @deprecated alias — utiliser ROLE_MEMBRES_ACTIFS */
const ROLE_MEMBRES = ROLE_MEMBRES_ACTIFS;

/**
 * Accès dashboard / administration SAAP :
 * uniquement Super Admin ou Admin délégué (flags isSuperAdmin / isAdmin).
 * Un titre C.G. seul ne suffit plus.
 */
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
  hasAdminAccess,
  isSuperAdmin,
  isCoordinateurGeneral,
  isSecretaireGeneral,
};
