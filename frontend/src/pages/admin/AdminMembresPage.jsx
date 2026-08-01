import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import { useAutocomplete } from '../../hooks/useAutocomplete';
import './AdminMembres.css';

function formatDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function brancheLabel(branche) {
  if (branche === 'FLAMBEAUX') return 'Flambeaux';
  if (branche === 'LUMIERES') return 'Lumières';
  return '—';
}

function statutClass(statut) {
  if (statut === 'VALIDE') return 'badge-valide';
  if (statut === 'REJETE' || statut === 'SUSPENDU') return 'badge-attente';
  return 'badge-en_attente';
}

const EMPTY_FORM = {
  nom: '',
  prenom: '',
  branche: '',
  dateNaissance: '',
  lieuNaissance: '',
  contact: '',
  email: '',
  password: '',
  situationMatrimoniale: '',
  profession: '',
  responsabiliteBureau: '',
  statut: 'EN_ATTENTE',
  roleId: '',
  regionId: '',
  districtId: '',
};

export default function AdminMembresPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [paroisseId, setParoisseId] = useState(null);

  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [roles, setRoles] = useState([]);

  const paroisseAc = useAutocomplete({
    endpoint: '/paroisses',
    params: form.districtId ? { districtId: form.districtId } : {},
  });

  const communauteAc = useAutocomplete({
    endpoint: '/communautes',
    params: paroisseId ? { paroisseId } : {},
  });

  async function load() {
    setError('');
    setLoading(true);
    try {
      const { data: res } = await api.get('/membres', {
        params: {
          search: search || undefined,
          statut: statutFilter || undefined,
          limit: 100,
        },
      });
      setData(res);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    Promise.all([api.get('/regions'), api.get('/roles')]).then(([r, rolesRes]) => {
      setRegions(r.data.data || []);
      setRoles(rolesRes.data.data || []);
    });
  }, []);

  useEffect(() => {
    if (!form.regionId) {
      setDistricts([]);
      return;
    }
    api.get(`/regions/${form.regionId}/districts`).then((res) => {
      setDistricts(res.data.data || []);
    });
  }, [form.regionId]);

  function openEdit(m) {
    setMsg('');
    setError('');
    setEditing(m);
    setForm({
      nom: m.nom || '',
      prenom: m.prenom || '',
      branche: m.branche || '',
      dateNaissance: formatDateInput(m.dateNaissance),
      lieuNaissance: m.lieuNaissance || '',
      contact: m.contact || '',
      email: m.email || '',
      password: '',
      situationMatrimoniale: m.situationMatrimoniale || '',
      profession: m.profession || '',
      responsabiliteBureau: m.responsabiliteBureau || '',
      statut: m.statut || 'EN_ATTENTE',
      roleId: m.roleId ? String(m.roleId) : '',
      regionId: m.regionId ? String(m.regionId) : '',
      districtId: m.districtId ? String(m.districtId) : '',
    });
    setParoisseId(m.paroisseId || null);
    paroisseAc.setQuery(m.paroisse?.nom || '');
    communauteAc.setQuery(m.communaute?.nom || '');
  }

  function closeEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setParoisseId(null);
    paroisseAc.setQuery('');
    communauteAc.setQuery('');
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'regionId') {
        next.districtId = '';
      }
      return next;
    });
    if (name === 'regionId') {
      setParoisseId(null);
      paroisseAc.setQuery('');
      communauteAc.setQuery('');
    }
    if (name === 'districtId') {
      setParoisseId(null);
      paroisseAc.setQuery('');
      communauteAc.setQuery('');
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const payload = {
        nom: form.nom,
        prenom: form.prenom,
        branche: form.branche,
        dateNaissance: form.dateNaissance,
        lieuNaissance: form.lieuNaissance,
        contact: form.contact || null,
        email: form.email || null,
        situationMatrimoniale: form.situationMatrimoniale || null,
        profession: form.profession || null,
        responsabiliteBureau: form.responsabiliteBureau || null,
        statut: form.statut,
        roleId: Number(form.roleId),
        regionId: form.regionId ? Number(form.regionId) : null,
        districtId: form.districtId ? Number(form.districtId) : null,
        paroisseNom: paroisseAc.query.trim() || undefined,
        paroisseId: paroisseId || undefined,
        communauteNom: communauteAc.query.trim() || undefined,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      await api.patch(`/membres/${editing.id}`, payload);
      setMsg('Membre mis à jour');
      closeEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  async function quickStatut(id, nextStatut) {
    setMsg('');
    setError('');
    try {
      await api.patch(`/membres/${id}`, { statut: nextStatut });
      setMsg(`Statut mis à jour : ${nextStatut}`);
      if (editing?.id === id) {
        setForm((f) => ({ ...f, statut: nextStatut }));
        setEditing((m) => (m ? { ...m, statut: nextStatut } : m));
      }
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Échec');
    }
  }

  const items = useMemo(() => data.items || [], [data.items]);

  return (
    <AdminShell title="Membres" crumbs={['Tableaux de bord', 'Membres']}>
      <section className="membres-page">
        <div className="membres-toolbar">
          <p className="muted membres-count">{data.total} membre(s)</p>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card membres-filters">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="search">Recherche</label>
              <input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder="Nom, ID, contact, email…"
              />
            </div>
            <div className="form-group">
              <label htmlFor="statutFilter">Statut</label>
              <select
                id="statutFilter"
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
              >
                <option value="">Tous</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="VALIDE">Validé</option>
                <option value="REJETE">Rejeté</option>
                <option value="SUSPENDU">Suspendu</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn" onClick={() => load()}>
            Filtrer
          </button>
        </div>

        {loading ? (
          <p className="muted">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Aucun membre trouvé.
            </p>
          </div>
        ) : (
          <div className="membres-list">
            {items.map((m) => (
              <article key={m.id} className="card membre-card">
                <div className="membre-card-main">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" className="membre-avatar" />
                  ) : (
                    <div className="membre-avatar membre-avatar--placeholder">
                      {(m.prenom?.[0] || '?')}
                      {(m.nom?.[0] || '')}
                    </div>
                  )}
                  <div className="membre-info">
                    <div className="membre-info-top">
                      <h3>
                        {m.prenom} {m.nom}
                      </h3>
                      <span className={`badge ${statutClass(m.statut)}`}>{m.statut}</span>
                    </div>
                    <p className="membre-meta">
                      <span>{m.idMembre}</span>
                      <span>·</span>
                      <span>{m.role?.nom || '—'}</span>
                      <span>·</span>
                      <span>{brancheLabel(m.branche)}</span>
                    </p>
                    <p className="membre-meta">
                      {[m.contact, m.email].filter(Boolean).join(' · ') || 'Pas de contact'}
                    </p>
                    <p className="membre-meta">
                      {[m.region?.nom, m.district?.nom, m.paroisse?.nom, m.communaute?.nom]
                        .filter(Boolean)
                        .join(' › ') || 'Localisation non renseignée'}
                    </p>
                  </div>
                </div>
                <div className="membre-actions">
                  <button type="button" className="btn" onClick={() => openEdit(m)}>
                    Modifier
                  </button>
                  {m.statut === 'EN_ATTENTE' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => quickStatut(m.id, 'VALIDE')}
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => quickStatut(m.id, 'REJETE')}
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <div className="membre-modal-backdrop" role="presentation" onClick={closeEdit}>
          <div
            className="membre-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-membre-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="membre-modal-head">
              <div>
                <p className="muted" style={{ margin: 0 }}>
                  {editing.idMembre}
                </p>
                <h2 id="edit-membre-title">
                  Modifier — {editing.prenom} {editing.nom}
                </h2>
              </div>
              <button type="button" className="membre-modal-close" onClick={closeEdit} aria-label="Fermer">
                ×
              </button>
            </div>

            <form className="membre-edit-form" onSubmit={saveEdit}>
              <section className="form-section">
                <h3 className="form-section-title">Identité</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nom">Nom</label>
                    <input id="nom" name="nom" value={form.nom} onChange={onChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="prenom">Prénom</label>
                    <input id="prenom" name="prenom" value={form.prenom} onChange={onChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="branche">Branche</label>
                    <select id="branche" name="branche" value={form.branche} onChange={onChange} required>
                      <option value="">Sélectionner…</option>
                      <option value="FLAMBEAUX">Flambeaux (Hommes)</option>
                      <option value="LUMIERES">Lumières (Femmes)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="statut">Statut</label>
                    <select id="statut" name="statut" value={form.statut} onChange={onChange} required>
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="VALIDE">Validé</option>
                      <option value="REJETE">Rejeté</option>
                      <option value="SUSPENDU">Suspendu</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dateNaissance">Date de naissance</label>
                    <input
                      id="dateNaissance"
                      name="dateNaissance"
                      type="date"
                      value={form.dateNaissance}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lieuNaissance">Lieu de naissance</label>
                    <input
                      id="lieuNaissance"
                      name="lieuNaissance"
                      value={form.lieuNaissance}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="form-section">
                <h3 className="form-section-title">Coordonnées</h3>
                <div className="form-group">
                  <label htmlFor="contact">Contact</label>
                  <input id="contact" name="contact" value={form.contact} onChange={onChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" value={form.email} onChange={onChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Nouveau mot de passe (optionnel)</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={onChange}
                    minLength={6}
                    placeholder="Laisser vide pour ne pas changer"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="situationMatrimoniale">Situation matrimoniale</label>
                  <select
                    id="situationMatrimoniale"
                    name="situationMatrimoniale"
                    value={form.situationMatrimoniale}
                    onChange={onChange}
                  >
                    <option value="">Sélectionner…</option>
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                    <option value="Concubinage">Concubinage</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="profession">Profession</label>
                  <input
                    id="profession"
                    name="profession"
                    value={form.profession}
                    onChange={onChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="responsabiliteBureau">Responsabilité dans le bureau</label>
                  <input
                    id="responsabiliteBureau"
                    name="responsabiliteBureau"
                    value={form.responsabiliteBureau}
                    onChange={onChange}
                  />
                </div>
              </section>

              <section className="form-section">
                <h3 className="form-section-title">Rôle & localisation</h3>
                <div className="form-group">
                  <label htmlFor="roleId">Titre</label>
                  <select id="roleId" name="roleId" value={form.roleId} onChange={onChange} required>
                    <option value="">Sélectionner…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="regionId">Région</label>
                  <select id="regionId" name="regionId" value={form.regionId} onChange={onChange}>
                    <option value="">—</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="districtId">District CMA</label>
                  <select
                    id="districtId"
                    name="districtId"
                    value={form.districtId}
                    onChange={onChange}
                    disabled={!form.regionId}
                  >
                    <option value="">—</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group autocomplete">
                  <label htmlFor="paroisse">Paroisse CMA</label>
                  <input
                    id="paroisse"
                    value={paroisseAc.query}
                    onChange={(e) => {
                      paroisseAc.setQuery(e.target.value);
                      setParoisseId(null);
                      communauteAc.setQuery('');
                    }}
                    onBlur={() => setTimeout(paroisseAc.close, 150)}
                    placeholder="Saisir ou choisir…"
                    disabled={!form.districtId}
                    autoComplete="off"
                  />
                  {paroisseAc.open && paroisseAc.suggestions.length > 0 && (
                    <div className="autocomplete-list">
                      {paroisseAc.suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={() => {
                            paroisseAc.select(item);
                            setParoisseId(item.id);
                          }}
                        >
                          {item.nom}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group autocomplete">
                  <label htmlFor="communaute">Communauté CMA</label>
                  <input
                    id="communaute"
                    value={communauteAc.query}
                    onChange={(e) => communauteAc.setQuery(e.target.value)}
                    onBlur={() => setTimeout(communauteAc.close, 150)}
                    placeholder="Saisir ou choisir…"
                    disabled={!paroisseAc.query}
                    autoComplete="off"
                  />
                  {communauteAc.open && communauteAc.suggestions.length > 0 && (
                    <div className="autocomplete-list">
                      {communauteAc.suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={() => communauteAc.select(item)}
                        >
                          {item.nom}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <div className="membre-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEdit}>
                  Annuler
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
