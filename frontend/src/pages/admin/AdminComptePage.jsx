import { useEffect, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import PasswordInput from '../../components/PasswordInput';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin as checkSuperAdmin } from '../../utils/roles';
import './AdminPages.css';

function statutClass(statut) {
  if (statut === 'VALIDE') return 'badge-valide';
  if (statut === 'REJETE' || statut === 'SUSPENDU') return 'badge-attente';
  return 'badge-en_attente';
}

const EMPTY_ADMIN_FORM = {
  nom: '',
  prenom: '',
  email: '',
  contact: '',
  password: '',
  confirm: '',
  branche: 'FLAMBEAUX',
};

export default function AdminComptePage() {
  const { user, refreshMe, setSession, token } = useAuthStore();
  const isSuper = checkSuperAdmin(user);

  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [creating, setCreating] = useState(false);

  const subAdminCount = admins.filter((a) => a.isAdmin && !a.isSuperAdmin).length;
  const canCreateSubAdmin = subAdminCount < 3;

  async function loadAdmins() {
    if (!isSuper) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/admins', {
        params: { search: search || undefined },
      });
      setAdmins(data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement des admins');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe().catch(() => {});
  }, []);

  useEffect(() => {
    if (isSuper) loadAdmins();
  }, [isSuper]);

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

  async function createAdmin(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (adminForm.password.length < 6) {
      setError('Mot de passe admin : 6 caractères minimum');
      return;
    }
    if (adminForm.password !== adminForm.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setCreating(true);
    try {
      const { confirm, ...payload } = adminForm;
      await api.post('/admins', payload);
      setMsg(`Compte admin créé pour ${adminForm.prenom} ${adminForm.nom}`);
      setAdminForm(EMPTY_ADMIN_FORM);
      await loadAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création');
    } finally {
      setCreating(false);
    }
  }

  async function setAdminStatut(id, statut) {
    setMsg('');
    setError('');
    try {
      await api.patch(`/admins/${id}`, { statut });
      setMsg(statut === 'VALIDE' ? 'Compte admin réactivé' : 'Compte admin suspendu');
      await loadAdmins();
    } catch (e) {
      setError(e.response?.data?.message || 'Échec');
    }
  }

  async function removeAdmin(m) {
    if (m.isSuperAdmin) {
      setError('Le compte Super Admin ne peut pas être supprimé');
      return;
    }
    const label = `${m.prenom} ${m.nom}`.trim() || m.idMembre;
    if (!window.confirm(`Supprimer définitivement le sous-admin ${label} ?`)) return;
    setMsg('');
    setError('');
    try {
      await api.delete(`/membres/${m.id}`);
      setMsg(`Compte admin ${label} supprimé`);
      await loadAdmins();
    } catch (e) {
      setError(e.response?.data?.message || 'Suppression impossible');
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
              {isSuper && <span className="badge badge-super">Super Admin</span>}
              {!isSuper && user?.isAdmin && <span className="badge badge-admin">Admin</span>}
            </p>
          </div>
          <form className="admin-form-inline" onSubmit={changePassword}>
            <PasswordInput
              id="new-pwd"
              name="password"
              label="Nouveau mot de passe"
              value={pwdForm.password}
              onChange={(e) => setPwdForm((f) => ({ ...f, password: e.target.value }))}
              minLength={6}
              required
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirm-pwd"
              name="confirm"
              label="Confirmer"
              value={pwdForm.confirm}
              onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
              minLength={6}
              required
              autoComplete="new-password"
            />
            <button type="submit" className="btn" disabled={savingPwd}>
              {savingPwd ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>

        {isSuper ? (
          <>
            <div className="card">
              <div className="card-head-simple">
                <h2>Créer un compte administrateur</h2>
                <p className="muted">
                  Ces comptes peuvent gérer le SAAP. Votre compte reste le seul Super Admin.
                  Sous-admins : {subAdminCount}/3.
                  {!canCreateSubAdmin && ' Limite atteinte — supprimez un compte pour en créer un autre.'}
                </p>
              </div>
              <form className="admin-create-form" onSubmit={createAdmin}>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label htmlFor="admin-prenom">Prénom</label>
                    <input
                      id="admin-prenom"
                      value={adminForm.prenom}
                      onChange={(e) => setAdminForm((f) => ({ ...f, prenom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="admin-nom">Nom</label>
                    <input
                      id="admin-nom"
                      value={adminForm.nom}
                      onChange={(e) => setAdminForm((f) => ({ ...f, nom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="admin-email">Email</label>
                    <input
                      id="admin-email"
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="admin-contact">Contact</label>
                    <input
                      id="admin-contact"
                      value={adminForm.contact}
                      onChange={(e) => setAdminForm((f) => ({ ...f, contact: e.target.value }))}
                      placeholder="07…"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="admin-branche">Branche</label>
                    <select
                      id="admin-branche"
                      value={adminForm.branche}
                      onChange={(e) => setAdminForm((f) => ({ ...f, branche: e.target.value }))}
                    >
                      <option value="FLAMBEAUX">Flambeaux</option>
                      <option value="LUMIERES">Lumières</option>
                    </select>
                  </div>
                  <PasswordInput
                    id="admin-pwd"
                    name="password"
                    label="Mot de passe"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    id="admin-pwd2"
                    name="confirm"
                    label="Confirmer le mot de passe"
                    value={adminForm.confirm}
                    onChange={(e) => setAdminForm((f) => ({ ...f, confirm: e.target.value }))}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="btn" disabled={creating || !canCreateSubAdmin}>
                    {creating ? 'Création…' : 'Créer le compte admin'}
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-head-simple">
                <h2>Comptes administrateurs</h2>
                <p className="muted">Suivi de tous les comptes admin (y compris le vôtre)</p>
              </div>
              <div className="membres-filters-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="admin-search">Recherche</label>
                  <input
                    id="admin-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadAdmins()}
                    placeholder="Nom, email, ID…"
                  />
                </div>
                <button type="button" className="btn" onClick={() => loadAdmins()}>
                  Filtrer
                </button>
              </div>

              {loading ? (
                <p className="muted">Chargement…</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table data-table-responsive">
                    <thead>
                      <tr>
                        <th>Administrateur</th>
                        <th>Email / contact</th>
                        <th>Niveau</th>
                        <th>Statut</th>
                        <th>Créé le</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((m) => (
                        <tr key={m.id}>
                          <td data-label="Administrateur">
                            <strong>
                              {m.prenom} {m.nom}
                            </strong>
                            <div className="muted tiny">{m.idMembre}</div>
                          </td>
                          <td data-label="Email / contact">
                            <div>{m.email || '—'}</div>
                            <div className="muted tiny">{m.contact || ''}</div>
                          </td>
                          <td data-label="Niveau">
                            {m.isSuperAdmin ? (
                              <span className="badge badge-super">Super Admin</span>
                            ) : (
                              <span className="badge badge-admin">Admin</span>
                            )}
                          </td>
                          <td data-label="Statut">
                            <span className={`badge ${statutClass(m.statut)}`}>{m.statut}</span>
                          </td>
                          <td className="muted tiny" data-label="Créé le">
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleDateString('fr-FR')
                              : '—'}
                          </td>
                          <td className="actions-cell" data-label="Actions">
                            {!m.isSuperAdmin && m.id !== user?.id && (
                              <>
                                {m.statut !== 'VALIDE' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setAdminStatut(m.id, 'VALIDE')}
                                  >
                                    Activer
                                  </button>
                                )}
                                {m.statut !== 'SUSPENDU' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setAdminStatut(m.id, 'SUSPENDU')}
                                  >
                                    Suspendre
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: '#b91c1c' }}
                                  onClick={() => removeAdmin(m)}
                                >
                                  Supprimer
                                </button>
                              </>
                            )}
                            {m.isSuperAdmin && <span className="muted tiny">Compte principal — non supprimable</span>}
                          </td>
                        </tr>
                      ))}
                      {!admins.length && (
                        <tr>
                          <td colSpan={6} className="muted">
                            Aucun compte admin
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card">
            <div className="card-head-simple">
              <h2>Droits administrateur</h2>
              <p className="muted">
                Vous disposez d’un accès admin délégué. Seul le Super Admin peut créer ou
                superviser les autres comptes administrateurs.
              </p>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
