import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import BrandLogo from './BrandLogo';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = hasAdminAccess(user);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to={isAdmin ? '/admin' : '/profil'} className="brand">
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
              <NavLink to="/admin">Tableau</NavLink>
              <NavLink to="/admin/membres">Membres</NavLink>
              <NavLink to="/admin/cotisations">Paiements</NavLink>
              <NavLink to="/profil">Profil</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/profil">Profil</NavLink>
              <NavLink to="/mes-cotisations">Cotisations</NavLink>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
