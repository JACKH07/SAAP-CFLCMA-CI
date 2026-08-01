/** Rôle unique avec accès dashboard / administration */
export const ROLE_COORDINATEUR_GENERAL = 'Coordinateur général (C.G.)';

/** @deprecated alias */
export const ROLE_SECRETAIRE_GENERAL = ROLE_COORDINATEUR_GENERAL;

export function hasAdminAccess(user) {
  return user?.role?.nom === ROLE_COORDINATEUR_GENERAL;
}
