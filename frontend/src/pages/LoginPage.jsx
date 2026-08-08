import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { paths } from '../config/env';
import BrandLogo from '../components/BrandLogo';
import './Auth.css';

/**
 * @param {'membre' | 'admin'} mode
 */
export default function LoginPage({ mode = 'membre' }) {
  const isAdminLogin = mode === 'admin';
  const navigate = useNavigate();
  const { token, user, login, logout, loading, error } = useAuthStore();
  const [form, setForm] = useState({ identifiant: '', password: '' });
  const [localError, setLocalError] = useState('');

  if (token && user) {
    return <Navigate to={hasAdminAccess(user) ? paths.admin : paths.profil} replace />;
  }

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setLocalError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLocalError('');
    const payload = { password: form.password };
    if (form.identifiant.includes('@')) {
      payload.email = form.identifiant.trim();
    } else if (/^[A-Z]{4}\d{8}/i.test(form.identifiant.trim())) {
      payload.idMembre = form.identifiant.trim().toUpperCase();
    } else {
      payload.contact = form.identifiant.trim();
    }

    try {
      const data = await login(payload);
      const isAdmin = hasAdminAccess(data.membre);

      if (isAdminLogin && !isAdmin) {
        logout();
        setLocalError(
          'Accès réservé aux administrateurs (Super Admin ou Admin). Utilisez la connexion membre.'
        );
        return;
      }

      if (!isAdminLogin && isAdmin) {
        logout();
        setLocalError('Compte administration : utilisez la page Connexion administrateur.');
        return;
      }

      navigate(isAdmin ? paths.admin : paths.profil);
    } catch {
      /* store */
    }
  }

  if (!isAdminLogin) {
    return (
      <div className="auth-page auth-page--membre">
        <div className="auth-bg-logo" aria-hidden="true" />
        <form className="card auth-card auth-card--membre" onSubmit={onSubmit}>
          <BrandLogo size={72} className="auth-card-logo" />
          <h2>Connexion</h2>
          {(error || localError) && (
            <div className="alert alert-error">{localError || error}</div>
          )}

          <div className="form-group">
            <label htmlFor="identifiant">ID membre, contact ou email</label>
            <input
              id="identifiant"
              name="identifiant"
              autoComplete="username"
              value={form.identifiant}
              onChange={onChange}
              required
              placeholder="ex. KOJA19950312"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          <button className="btn btn-block" type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>

          <p className="auth-footer muted">
            Pas encore de compte ? <Link to={paths.register}>S&apos;inscrire</Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--admin">
      <div className="auth-hero">
        <BrandLogo size={96} className="auth-logo" />
        <p className="eyebrow">Coordination Flambeaux-Lumières CMA</p>
        <h1>Administration SAAP</h1>
        <p className="lede">Réservé au Super Admin et aux administrateurs</p>
      </div>

      <form className="card auth-card auth-card--admin" onSubmit={onSubmit}>
        <h2>Connexion administrateur</h2>
        {(error || localError) && (
          <div className="alert alert-error">{localError || error}</div>
        )}

        <div className="form-group">
          <label htmlFor="identifiant-admin">Email ou ID administrateur</label>
          <input
            id="identifiant-admin"
            name="identifiant"
            autoComplete="username"
            value={form.identifiant}
            onChange={onChange}
            required
            placeholder="admin@flccmaci.org"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password-admin">Mot de passe</label>
          <input
            id="password-admin"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        <button className="btn btn-block btn-accent" type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Accéder au tableau de bord'}
        </button>

        <p className="auth-footer muted">
          Vous êtes membre ? <Link to={paths.login}>Connexion</Link>
        </p>
      </form>
    </div>
  );
}
