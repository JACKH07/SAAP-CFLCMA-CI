import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { paths } from '../config/env';
import BrandLogo from '../components/BrandLogo';
import PasswordInput from '../components/PasswordInput';
import './Auth.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token.trim()) {
      setError('Lien invalide : jeton manquant.');
      return;
    }
    if (password.length < 6) {
      setError('Mot de passe : 6 caractères minimum');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token: token.trim(),
        password,
        confirmPassword: confirm,
      });
      setSuccess(data.data?.message || 'Mot de passe mis à jour.');
      setTimeout(() => navigate(paths.login), 1200);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'TOKEN_EXPIRED') {
        setError('Ce lien a expiré. Demandez-en un nouveau.');
      } else if (code === 'TOKEN_USED') {
        setError('Ce lien a déjà été utilisé.');
      } else if (code === 'TOKEN_INVALID') {
        setError('Lien invalide. Vérifiez l’URL ou redemandez un lien.');
      } else {
        setError(err.response?.data?.message || 'Échec de la réinitialisation');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-page--membre">
      <div className="auth-bg-logo" aria-hidden="true" />
      <form className="card auth-card auth-card--membre" onSubmit={onSubmit}>
        <BrandLogo size={72} className="auth-card-logo" />
        <h2>Nouveau mot de passe</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!tokenFromUrl && (
          <div className="form-group">
            <label htmlFor="reset-token">Code / jeton</label>
            <input
              id="reset-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="Coller le jeton reçu"
            />
          </div>
        )}

        <PasswordInput
          id="new-password"
          name="password"
          label="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
        />

        <PasswordInput
          id="confirm-password"
          name="confirm"
          label="Confirmer le mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
        />

        <button className="btn btn-block" type="submit" disabled={loading || Boolean(success)}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>

        <p className="auth-footer muted">
          <Link to={paths.forgotPassword}>Renvoyer un lien</Link>
          {' · '}
          <Link to={paths.login}>Connexion</Link>
        </p>
      </form>
    </div>
  );
}
