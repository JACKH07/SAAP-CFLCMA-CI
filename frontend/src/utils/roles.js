/** Rôle unique avec accès dashboard / administration */
export const ROLE_COORDINATEUR_GENERAL = 'Coordinateur général (C.G.)';

/** @deprecated alias */
export const ROLE_SECRETAIRE_GENERAL = ROLE_COORDINATEUR_GENERAL;

/** Accès admin / dashboard réservé au Coordinateur général (C.G.) */
export function hasAdminAccess(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.role?.niveauHierarchique === 1) return true;
  return user.role?.nom === ROLE_COORDINATEUR_GENERAL;
}
