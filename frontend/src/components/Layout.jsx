import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { paths } from '../config/env';
import BrandLogo from './BrandLogo';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = hasAdminAccess(user);

  function handleLogout() {
    logout();
    navigate(paths.login);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to={isAdmin ? paths.admin : paths.profil} className="brand">
            <BrandLogo size={42} className="brand-logo--nav" />
            <span className="brand-text">
              <strong>SAAP</strong>
              <small>CFLCMA-CI</small>
            </span>
          </NavLink>
          {user && (
            <button type="button" className="btn-logout" onClick={handleLogout}>
              Déconnexion
            </button>
          )}
        </div>
      </header>

      <main className="main-content container">{children}</main>

      {user && (
        <nav className="bottom-nav" aria-label="Navigation principale">
          {isAdmin ? (
            <>
              <NavLink to={paths.admin}>Tableau</NavLink>
              <NavLink to={paths.adminMembres}>Membres</NavLink>
              <NavLink to={paths.adminCotisations}>Paiements</NavLink>
              <NavLink to={paths.profil}>Profil</NavLink>
            </>
          ) : (
            <>
              <NavLink to={paths.profil}>Profil</NavLink>
              <NavLink to={paths.mesCotisations}>Cotisations</NavLink>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
