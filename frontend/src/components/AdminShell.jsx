import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import BrandLogo from './BrandLogo';
import './AdminShell.css';

const NAV = [
  {
    label: 'Principal',
    items: [
      { to: '/admin', end: true, label: 'Analytique', icon: 'chart' },
      { to: '/admin/membres', label: 'Membres', icon: 'users' },
      { to: '/admin/cotisations', label: 'Paiements', icon: 'pay' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { to: '/profil', label: 'Mon profil', icon: 'user' },
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
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminShell({ children, title = 'Analytique', crumbs = ['Tableaux de bord', 'Analytique'] }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/admin_connecte');
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
                  onClick={() => setOpen(false)}
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
              Déconnexion
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
