/** Rôle unique avec accès dashboard / administration complète */
const ROLE_COORDINATEUR_GENERAL = 'Coordinateur général (C.G.)';

/** Membre simple du mouvement (sans mandat) */
const ROLE_MEMBRES_ACTIFS = 'Membres actifs';

/** @deprecated alias — utiliser ROLE_COORDINATEUR_GENERAL */
const ROLE_SECRETAIRE_GENERAL = ROLE_COORDINATEUR_GENERAL;

/** @deprecated alias — utiliser ROLE_MEMBRES_ACTIFS */
const ROLE_MEMBRES = ROLE_MEMBRES_ACTIFS;

/**
 * Accès admin / dashboard réservé exclusivement au Coordinateur général (C.G.).
 */
function hasAdminAccess(membre) {
  return membre?.role?.nom === ROLE_COORDINATEUR_GENERAL;
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
  isCoordinateurGeneral,
  isSecretaireGeneral,
};
