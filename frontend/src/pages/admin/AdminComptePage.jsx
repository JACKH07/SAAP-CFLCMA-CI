import { useEffect, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import './AdminPages.css';

function statutClass(statut) {
  if (statut === 'VALIDE') return 'badge-valide';
  if (statut === 'REJETE' || statut === 'SUSPENDU') return 'badge-attente';
  return 'badge-en_attente';
}

export default function AdminComptePage() {
  const { user, refreshMe, setSession, token } = useAuthStore();
  const [comptes, setComptes] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/membres', {
        params: { search: search || undefined, limit: 100 },
      });
      setComptes(data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    refreshMe().catch(() => {});
  }, []);

  async function changePassword(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (pwdForm.password.length < 6) {
      setError('Mot de passe : 6 caractères minimum');
      return;
    }
    if (pwdForm.password !== pwdForm.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!user?.id) return;
    setSavingPwd(true);
    try {
      await api.patch(`/membres/${user.id}`, { password: pwdForm.password });
      setMsg('Mot de passe mis à jour');
      setPwdForm({ password: '', confirm: '' });
      const me = await refreshMe();
      if (me && token) setSession(token, me);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour');
    } finally {
      setSavingPwd(false);
    }
  }

  async function setStatut(id, statut) {
    setMsg('');
    setError('');
    try {
      await api.patch(`/membres/${id}`, { statut });
      setMsg(`Compte mis à jour : ${statut}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Échec');
    }
  }

  return (
    <AdminShell title="Compte" crumbs={['Administration', 'Compte']}>
      <section className="admin-page">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <div className="card-head-simple">
            <h2>Mon compte administrateur</h2>
            <p className="muted">
              {user?.prenom} {user?.nom} · {user?.email || user?.idMembre}
            </p>
          </div>
          <form className="admin-form-inline" onSubmit={changePassword}>
            <div className="form-group">
              <label htmlFor="new-pwd">Nouveau mot de passe</label>
              <input
                id="new-pwd"
                type="password"
                value={pwdForm.password}
                onChange={(e) => setPwdForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-pwd">Confirmer</label>
              <input
                id="confirm-pwd"
                type="password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn" disabled={savingPwd}>
              {savingPwd ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-head-simple">
            <h2>Comptes membres</h2>
            <p className="muted">Identifiants et statuts des comptes</p>
          </div>
          <div className="membres-filters-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="compte-search">Recherche</label>
              <input
                id="compte-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder="Nom, email, ID…"
              />
            </div>
            <button type="button" className="btn" onClick={() => load()}>
              Filtrer
            </button>
          </div>

          {loading ? (
            <p className="muted">Chargement…</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Email / contact</th>
                    <th>Titre</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {comptes.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>
                          {m.prenom} {m.nom}
                        </strong>
                        <div className="muted tiny">{m.idMembre}</div>
                      </td>
                      <td>
                        <div>{m.email || '—'}</div>
                        <div className="muted tiny">{m.contact || ''}</div>
                      </td>
                      <td>{m.role?.nom || '—'}</td>
                      <td>
                        <span className={`badge ${statutClass(m.statut)}`}>{m.statut}</span>
                      </td>
                      <td className="actions-cell">
                        {m.statut !== 'VALIDE' && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStatut(m.id, 'VALIDE')}>
                            Activer
                          </button>
                        )}
                        {m.statut !== 'SUSPENDU' && m.id !== user?.id && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStatut(m.id, 'SUSPENDU')}>
                            Suspendre
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!comptes.length && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Aucun compte
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
