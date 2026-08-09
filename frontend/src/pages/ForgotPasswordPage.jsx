import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { paths } from '../config/env';
import BrandLogo from '../components/BrandLogo';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [identifiant, setIdentifiant] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResetUrl('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { identifiant: identifiant.trim() });
      setDone(true);
      if (data.data?.resetUrl) setResetUrl(data.data.resetUrl);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'ACCOUNT_NOT_FOUND') {
        setError('Aucun compte trouvé avec cet email ou ce numéro.');
      } else {
        setError(err.response?.data?.message || 'Impossible d’envoyer le lien.');
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
        <h2>Mot de passe oublié</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Saisissez l’email ou le numéro associé à votre compte. Nous vous enverrons un lien de
          réinitialisation.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {done && (
          <div className="alert alert-success">
            Si un compte correspond, un lien de réinitialisation a été envoyé.
            {resetUrl && (
              <p style={{ marginTop: '0.65rem', wordBreak: 'break-all' }}>
                <strong>Lien (mode test) :</strong>{' '}
                <a href={resetUrl}>{resetUrl}</a>
              </p>
            )}
          </div>
        )}

        {!done && (
          <>
            <div className="form-group">
              <label htmlFor="identifiant-reset">Email ou téléphone</label>
              <input
                id="identifiant-reset"
                type="text"
                autoComplete="username"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                required
                placeholder="email@exemple.com ou 07…"
              />
            </div>
            <button className="btn btn-block" type="submit" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </>
        )}

        <p className="auth-footer muted">
          <Link to={paths.login}>Retour à la connexion</Link>
        </p>
      </form>
    </div>
  );
}
