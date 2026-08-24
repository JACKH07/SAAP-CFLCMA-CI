import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { loginPathAfterLogout } from '../utils/logout';
import { paths } from '../config/env';
import BrandLogo from './BrandLogo';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout, portal, setPortal } = useAuthStore();
  const navigate = useNavigate();
  const canAdmin = hasAdminAccess(user);
  // Navigation membre sauf si on est explicitement en portail admin
  const inAdminPortal = canAdmin && portal === 'admin';

  function handleLogout() {
    const redirectTo = loginPathAfterLogout(user);
    logout();
    navigate(redirectTo);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to={paths.profil} className="brand">
            <BrandLogo size={42} className="brand-logo--nav" />
            <span className="brand-text">
              <strong>SAAP</strong>
              <small>CFLCMA-CI</small>
            </span>
          </NavLink>
        </div>
      </header>

      <main className="main-content container">{children}</main>

      {user && (
        <nav className="bottom-nav" aria-label="Navigation principale">
          {inAdminPortal ? (
            <>
              <NavLink to={paths.admin} onClick={() => setPortal('admin')}>
                Tableau
              </NavLink>
              <NavLink to={paths.adminMembres}>Membres</NavLink>
              <NavLink to={paths.adminCotisations}>Cotisations</NavLink>
              <NavLink to={paths.profil} onClick={() => setPortal('membre')}>
                Profil
              </NavLink>
              <button type="button" className="btn-logout-nav" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink to={paths.profil}>Profil</NavLink>
              <NavLink to={paths.mesCotisations}>Cotisations</NavLink>
              <button type="button" className="btn-logout-nav" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
