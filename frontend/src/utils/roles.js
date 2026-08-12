/** Rôle organisationnel (mouvement) — distinct des droits SAAP admin */
export const ROLE_COORDINATEUR_GENERAL = 'Coordinateur Général (CG)';

/** @deprecated alias */
export const ROLE_SECRETAIRE_GENERAL = ROLE_COORDINATEUR_GENERAL;

/**
 * Accès dashboard / administration SAAP :
 * uniquement Super Admin ou Admin délégué.
 */
export function hasAdminAccess(user) {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  return user.isAdmin === true;
}

export function isSuperAdmin(user) {
  return Boolean(user?.isSuperAdmin);
}
