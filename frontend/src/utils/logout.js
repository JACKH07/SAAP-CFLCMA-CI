import { paths } from '../config/env';
import { hasAdminAccess } from './roles';

/** Page de connexion après déconnexion ou session expirée. */
export function loginPathAfterLogout(user) {
  return hasAdminAccess(user) ? paths.adminLogin : paths.login;
}

export function loginPathAfterSessionExpired(pathname, user) {
  if (pathname === paths.admin || pathname.startsWith(`${paths.admin}/`)) {
    return paths.adminLogin;
  }
  return loginPathAfterLogout(user);
}
