import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { loginPathAfterLogout } from '../utils/logout';
import { paths } from '../config/env';
import BrandLogo from './BrandLogo';
import './Layout.css';

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8Z"
      />
    </svg>
  );
}

function IconPayments() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 7H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2Zm0 10H3V9h18v8ZM4 4h16v2H4V4Z"
      />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 17v-3H3v-4h7V7l5 5-5 5Zm9-14H9c-1.1 0-2 .9-2 2v3h2V5h10v14H9v-3H7v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z"
      />
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout, portal, setPortal } = useAuthStore();
  const navigate = useNavigate();
  const canAdmin = hasAdminAccess(user);
  const inAdminPortal = canAdmin && portal === 'admin';

  function handleLogout() {
    const redirectTo = loginPathAfterLogout(user);
    logout();
    navigate(redirectTo);
  }

  return (
    <div className={`app-shell ${inAdminPortal ? 'app-shell--admin' : 'app-shell--member'}`}>
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to={paths.profil} className="brand">
            <BrandLogo size={42} className="brand-logo--nav" />
            <span className="brand-text">
              <strong>SAAP</strong>
              <small>CFLCMA-CI</small>
            </span>
          </NavLink>
          {!inAdminPortal && user && (
            <button type="button" className="btn-logout-header" onClick={handleLogout}>
              Déconnexion
              <IconLogout />
            </button>
          )}
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
              <NavLink to={paths.profil} className="bottom-nav-item">
                <IconProfile />
                <span>Profil</span>
              </NavLink>
              <NavLink to={paths.mesCotisations} className="bottom-nav-item">
                <IconPayments />
                <span>Cotisations</span>
              </NavLink>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
