import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { paths } from '../config/env';
import BrandLogo from '../components/BrandLogo';
import PasswordInput from '../components/PasswordInput';
import './Auth.css';

/**
 * @param {'membre' | 'admin'} mode
 */
export default function LoginPage({ mode = 'membre' }) {
  const isAdminLogin = mode === 'admin';
  const navigate = useNavigate();
  const { token, user, login, logout, setPortal, loading, error } = useAuthStore();
  const [form, setForm] = useState({ identifiant: '', password: '' });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isAdminLogin && (token || user)) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée sur /login
  }, [isAdminLogin]);

  if (isAdminLogin && token && user) {
    if (!hasAdminAccess(user)) {
      return <Navigate to={paths.profil} replace />;
    }
    return <Navigate to={paths.admin} replace />;
  }

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setLocalError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLocalError('');
    const payload = {
      password: form.password,
      portal: isAdminLogin ? 'admin' : 'membre',
      requireAdmin: isAdminLogin,
    };
    if (form.identifiant.includes('@')) {
      payload.email = form.identifiant.trim();
    } else if (/^[A-Z]{4}\d{8}/i.test(form.identifiant.trim())) {
      payload.idMembre = form.identifiant.trim().toUpperCase();
    } else {
      payload.contact = form.identifiant.trim();
    }

    try {
      const data = await login(payload, isAdminLogin ? 'admin' : 'membre');
      const isAdmin = hasAdminAccess(data.membre);

      if (isAdminLogin) {
        if (!isAdmin) {
          logout();
          setLocalError(
            'Les membres n’ont pas accès à cette page. Utilisez la connexion membre.'
          );
          return;
        }
        navigate(paths.admin);
        return;
      }

      if (isAdmin) {
        setPortal('admin');
        navigate(paths.admin);
        return;
      }

      navigate(paths.profil);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (isAdminLogin
          ? 'Les membres n’ont pas accès à la connexion administrateur.'
          : null);
      if (msg) setLocalError(msg);
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

          <PasswordInput
            id="password"
            name="password"
            label="Mot de passe"
            value={form.password}
            onChange={onChange}
            autoComplete="current-password"
            required
          />

          <p className="auth-forgot">
            <Link to={paths.forgotPassword}>Mot de passe oublié ?</Link>
          </p>

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
        <p className="lede">Réservé uniquement au Super Admin et aux sous-admins</p>
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

        <PasswordInput
          id="password-admin"
          name="password"
          label="Mot de passe"
          value={form.password}
          onChange={onChange}
          autoComplete="current-password"
          required
        />

        <p className="auth-forgot">
          <Link to={paths.forgotPassword}>Mot de passe oublié ?</Link>
        </p>

        <button className="btn btn-block btn-accent" type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Accéder au tableau de bord'}
        </button>

        <p className="auth-footer muted">
          Vous êtes membre ? <Link to={paths.login}>Connexion membre</Link>
        </p>
      </form>
    </div>
  );
}
