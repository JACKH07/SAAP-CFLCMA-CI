import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { paths } from '../config/env';
import { loginPathAfterLogout } from '../utils/logout';
import BrandLogo from './BrandLogo';
import './AdminShell.css';

const NAV = [
  {
    label: 'Tableaux de bord',
    items: [
      { to: paths.admin, end: true, label: 'Flambeaux & Lumières', icon: 'chart' },
      { to: paths.adminMembres, label: 'Membres', icon: 'users' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: paths.adminBureau, label: 'Bureau', icon: 'bureau' },
      { to: paths.adminCompte, label: 'Compte', icon: 'compte' },
      { to: paths.adminActivite, label: 'Activités', icon: 'activite' },
      { to: paths.adminGeo, label: 'Territoire', icon: 'geo' },
      { to: paths.adminCotisations, label: 'Cotisations', icon: 'pay' },
    ],
  },
  {
    label: 'Profil',
    items: [
      { to: paths.profil, label: 'Mon profil', icon: 'user' },
    ],
  },
];

function NavIcon({ type }) {
  if (type === 'chart') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'users') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M20 19v-1a3.5 3.5 0 0 0-2.5-3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === 'pay') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === 'bureau') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'compte') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'activite') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === 'geo') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 12h15M12 4.5c2.2 2.4 3.3 4.9 3.3 7.5S14.2 17.1 12 19.5C9.8 17.1 8.7 14.6 8.7 12S9.8 6.9 12 4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminShell({ children, title = 'Analytique', crumbs = ['Tableaux de bord', 'Analytique'] }) {
  const { user, logout, setPortal } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    const redirectTo = loginPathAfterLogout(user);
    logout();
    navigate(redirectTo);
  }

  return (
    <div className={`admin-shell ${open ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <BrandLogo size={44} className="sidebar-logo-img" />
          <div>
            <strong>SAAP</strong>
            <small>CFLCMA-CI</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    if (item.to === paths.profil) setPortal('membre');
                    else setPortal('admin');
                  }}
                >
                  <span className="nav-ico"><NavIcon type={item.icon} /></span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <button type="button" className="sidebar-backdrop" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              ☰
            </button>
            <div className="breadcrumbs">
              {crumbs.map((c, i) => (
                <span key={c}>
                  {i > 0 && <span className="sep">›</span>}
                  <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="topbar-right">
            <div className="user-chip">
              <div className="avatar">
                {(user?.prenom?.[0] || 'S')}
                {(user?.nom?.[0] || 'G')}
              </div>
              <div className="user-meta">
                <strong>
                  {user?.prenom} {user?.nom}
                </strong>
                <small>{user?.role?.nom || 'Coordinateur général (C.G.)'}</small>
              </div>
            </div>
            <button type="button" className="btn-logout-sm" onClick={handleLogout}>
              <span className="logout-label">Déconnexion</span>
              <span className="logout-icon" aria-hidden>
                ⎋
              </span>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <h1 className="page-title">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
