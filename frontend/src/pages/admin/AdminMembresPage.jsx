import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import { useAutocomplete } from '../../hooks/useAutocomplete';
import { useAuthStore } from '../../store/authStore';
import { adminMembreProfilPath } from '../../config/env';
import DateInputFr from '../../components/DateInputFr';
import MemberAvatar from '../../components/MemberAvatar';
import PasswordInput from '../../components/PasswordInput';
import RoleSelect from '../../components/RoleSelect';
import ProfilePhotoCapture from '../../components/ProfilePhotoCapture';
import './AdminMembres.css';
import './AdminMembreProfil.css';

function formatDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function initials(prenom, nom) {
  return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?';
}

const PAGE_SIZE = 20;

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
  statut: 'VALIDE',
  roleId: '',
  regionId: '',
  districtId: '',
};

export default function AdminMembresPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ id: '', nom: '', region: '' });
  const [applied, setApplied] = useState({ id: '', nom: '', region: '' });
  const [selected, setSelected] = useState(() => new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('liste');
  const [form, setForm] = useState(EMPTY_FORM);
  const [paroisseId, setParoisseId] = useState(null);
  const [photo, setPhoto] = useState(null);

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

  async function load({
    pageNum = page,
    filtersOverride = applied,
    regionsList = regions,
  } = {}) {
    setError('');
    setLoading(true);
    try {
      const idQ = (filtersOverride.id || '').trim();
      const nomQ = (filtersOverride.nom || '').trim();
      const regionQ = (filtersOverride.region || '').trim().toLowerCase();
      const search = idQ || nomQ || undefined;

      let regionId;
      if (regionQ && regionsList.length) {
        const match = regionsList.find((r) =>
          String(r.nom || '')
            .toLowerCase()
            .includes(regionQ)
        );
        regionId = match?.id;
      }

      const { data: res } = await api.get('/membres', {
        params: {
          page: pageNum,
          limit: PAGE_SIZE,
          search,
          regionId: regionId || undefined,
        },
      });
      setData({
        items: res.items || [],
        total: res.total || 0,
        page: res.page || pageNum,
        limit: res.limit || PAGE_SIZE,
        totalPages: res.totalPages || Math.max(1, Math.ceil((res.total || 0) / PAGE_SIZE)),
      });
      setPage(res.page || pageNum);
      setSelected(new Set());
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([api.get('/regions'), api.get('/roles')]).then(([r, rolesRes]) => {
      const regs = r.data.data || [];
      setRegions(regs);
      setRoles(rolesRes.data.data || []);
      load({ pageNum: 1, regionsList: regs });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Ouverture modification depuis la page profil (bouton Modifier)
  useEffect(() => {
    const editId = location.state?.editMembreId;
    if (!editId) return;

    const local = data.items.find((x) => Number(x.id) === Number(editId));
    if (local) {
      openEdit(local);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    api
      .get(`/membres/${editId}`)
      .then((res) => {
        if (res.data?.data) openEdit(res.data.data);
        navigate(location.pathname, { replace: true, state: {} });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  function runSearch(e) {
    e?.preventDefault();
    const next = { ...filters };
    setApplied(next);
    setPage(1);
    load({ pageNum: 1, filtersOverride: next });
  }

  function goPrev() {
    if (page <= 1) return;
    const next = page - 1;
    setPage(next);
    load({ pageNum: next });
  }

  function goNext() {
    if (page >= (data.totalPages || 1)) return;
    const next = page + 1;
    setPage(next);
    load({ pageNum: next });
  }

  function formatDateFr(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR');
  }

  function brancheLabel(branche) {
    if (branche === 'FLAMBEAUX') return 'Flambeaux';
    if (branche === 'LUMIERES') return 'Lumières';
    return '—';
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked, ids) {
    setSelected(checked ? new Set(ids) : new Set());
  }

  function openEdit(m) {
    setView('liste');
    setMsg('');
    setError('');
    setEditing(m);
    setOpenMenuId(null);
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
    setPhoto(null);
  }

  function resetFormFields() {
    setForm({ ...EMPTY_FORM, statut: 'VALIDE' });
    setParoisseId(null);
    paroisseAc.setQuery('');
    communauteAc.setQuery('');
    setPhoto(null);
  }

  function openInscription() {
    closeEdit();
    resetFormFields();
    setView('inscription');
    setMsg('');
    setError('');
  }

  function openListe() {
    if (view === 'inscription') {
      resetFormFields();
    }
    setView('liste');
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

  async function saveCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      if (!form.password.trim() || form.password.trim().length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setSaving(false);
        return;
      }
      if (!form.roleId) {
        setError('Sélectionnez un titre ou un grade');
        setSaving(false);
        return;
      }
      const payload = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        branche: form.branche,
        dateNaissance: form.dateNaissance,
        lieuNaissance: form.lieuNaissance.trim(),
        contact: form.contact.trim() || '',
        email: form.email.trim() || '',
        password: form.password.trim(),
        situationMatrimoniale: form.situationMatrimoniale || '',
        profession: form.profession.trim() || '',
        responsabiliteBureau: form.responsabiliteBureau.trim() || '',
        statut: form.statut || 'VALIDE',
        roleId: Number(form.roleId),
        regionId: form.regionId ? Number(form.regionId) : '',
        districtId: form.districtId ? Number(form.districtId) : '',
        paroisseNom: paroisseAc.query.trim() || '',
        paroisseId: paroisseId || '',
        communauteNom: communauteAc.query.trim() || '',
      };

      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        body.append(key, value);
      });
      if (photo instanceof File) {
        body.append('photo', photo);
      }

      await api.post('/membres', body);
      setMsg('Membre inscrit avec succès');
      resetFormFields();
      setView('liste');
      setPage(1);
      await load({ pageNum: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'inscription");
    } finally {
      setSaving(false);
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
      if (photo instanceof File) {
        const fd = new FormData();
        fd.append('photo', photo);
        await api.patch(`/membres/${editing.id}/photo`, fd);
      }
      setMsg('Membre mis à jour');
      closeEdit();
      await load({ pageNum: page });
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
      await load({ pageNum: page });
    } catch (e) {
      setError(e.response?.data?.message || 'Échec');
    }
  }

  async function removeMembre(m) {
    if (m.isSuperAdmin) {
      setError('Le compte Super Admin ne peut pas être supprimé');
      setOpenMenuId(null);
      return;
    }
    if (m.id === user?.id) {
      setError('Vous ne pouvez pas supprimer votre propre compte');
      setOpenMenuId(null);
      return;
    }
    const label = `${m.prenom} ${m.nom}`.trim() || m.idMembre;
    if (!window.confirm(`Supprimer définitivement ${label} ?`)) return;
    setMsg('');
    setError('');
    setOpenMenuId(null);
    try {
      await api.delete(`/membres/${m.id}`);
      setMsg(`Membre ${label} supprimé`);
      if (editing?.id === m.id) closeEdit();
      const nextPage = items.length <= 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      await load({ pageNum: nextPage });
    } catch (e) {
      setError(e.response?.data?.message || 'Suppression impossible');
    }
  }

  function openProfil(m) {
    setOpenMenuId(null);
    navigate(adminMembreProfilPath(m.id));
  }

  function canDeleteMembre(m) {
    if (!m) return false;
    // Compte Super Admin : jamais de bouton Supprimer
    if (m.isSuperAdmin === true || m.isSuperAdmin === 1) return false;
    // Pas soi-même
    if (user?.id != null && Number(m.id) === Number(user.id)) return false;
    // Page réservée aux admins : afficher Supprimer pour tous les autres
    return true;
  }

  function renderActionsMenu(m) {
    return (
      <div className="row-menu">
        <button
          type="button"
          className="row-menu-btn"
          aria-label="Actions"
          onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
        >
          ⋯
        </button>
        {openMenuId === m.id && (
          <div className="row-menu-list" role="menu">
            <button type="button" role="menuitem" onClick={() => openProfil(m)}>
              Voir le profil
            </button>
            <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); openEdit(m); }}>
              Modifier
            </button>
            {canDeleteMembre(m) ? (
              <button
                type="button"
                role="menuitem"
                className="row-menu-danger"
                onClick={() => removeMembre(m)}
              >
                Supprimer
              </button>
            ) : null}
            {m.statut === 'EN_ATTENTE' && (
              <>
                <button type="button" onClick={() => { setOpenMenuId(null); quickStatut(m.id, 'VALIDE'); }}>
                  Valider
                </button>
                <button type="button" onClick={() => { setOpenMenuId(null); quickStatut(m.id, 'REJETE'); }}>
                  Rejeter
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const items = data.items || [];
  const total = data.total || 0;
  const totalPages = data.totalPages || Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, total);
  const allIds = items.map((m) => m.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const isInscription = view === 'inscription';

  function renderMembreForm(isCreate) {
    return (
      <form className="membre-edit-form" onSubmit={isCreate ? saveCreate : saveEdit}>
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
            <div className="form-group form-group--date">
              <label htmlFor="dateNaissance">Date de naissance</label>
              <DateInputFr
                id="dateNaissance"
                name="dateNaissance"
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
          <PasswordInput
            id="password"
            name="password"
            label={
              isCreate ? (
                <>
                  Mot de passe <span className="req">*</span>
                </>
              ) : (
                'Nouveau mot de passe (optionnel)'
              )
            }
            value={form.password}
            onChange={onChange}
            minLength={6}
            required={isCreate}
            autoComplete="new-password"
            placeholder={isCreate ? '' : 'Laisser vide pour ne pas changer'}
          />
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
          <h3 className="form-section-title">Titre & grade</h3>
          <p className="muted tiny" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem' }}>
            Renseignez le titre ou le grade — un seul des deux champs.
          </p>
          <RoleSelect
            id="roleId"
            name="roleId"
            roles={roles}
            value={form.roleId}
            onChange={onChange}
            required
          />
        </section>

        <section className="form-section">
          <h3 className="form-section-title">Localisation</h3>
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

        <section className="form-section">
          <h3 className="form-section-title">Photo de profil</h3>
          <ProfilePhotoCapture
            value={photo}
            onChange={setPhoto}
            onError={(msg) => setError(msg || '')}
          />
        </section>

        <div className="membre-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={isCreate ? openListe : closeEdit}
          >
            Annuler
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving
              ? isCreate
                ? 'Inscription…'
                : 'Enregistrement…'
              : isCreate
                ? 'Inscrire le membre'
                : 'Enregistrer'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <AdminShell title="Membres" crumbs={['Tableaux de bord', 'Membres']}>
      <section className="membres-page">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card membres-panel">
          <div className="membres-tabs" role="tablist" aria-label="Membres">
            <button
              type="button"
              role="tab"
              className={!isInscription ? 'active' : ''}
              aria-selected={!isInscription}
              onClick={openListe}
            >
              Liste des membres
            </button>
            <button
              type="button"
              role="tab"
              className={isInscription ? 'active' : ''}
              aria-selected={isInscription}
              onClick={openInscription}
            >
              Inscription membre
            </button>
          </div>

          {isInscription ? (
            <>
              <div className="membres-panel-head">
                <h2>Inscrire un membre</h2>
                <p className="muted">Créez le compte d’un membre depuis l’administration.</p>
              </div>
              {renderMembreForm(true)}
            </>
          ) : (
            <>
          <div className="membres-panel-head">
            <h2>Données de tous les membres</h2>
          </div>

          <form className="membres-search-bar" onSubmit={runSearch}>
            <input
              type="search"
              value={filters.id}
              onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
              placeholder="Recherche par ID membre…"
              aria-label="Recherche par ID"
            />
            <input
              type="search"
              value={filters.nom}
              onChange={(e) => setFilters((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Recherche par nom…"
              aria-label="Recherche par nom"
            />
            <input
              type="search"
              value={filters.region}
              onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
              placeholder="Recherche par région…"
              aria-label="Recherche par région"
            />
            <button type="submit" className="btn-search">
              Recherche
            </button>
          </form>

          {loading ? (
            <p className="muted">Chargement…</p>
          ) : (
            <div className="data-table-wrap">
              <table className="membres-data-table membres-data-table--rich">
                <thead>
                  <tr>
                    <th className="col-check">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked, allIds)}
                        aria-label="Tout sélectionner"
                      />
                    </th>
                    <th>ID</th>
                    <th>Photo</th>
                    <th>Nom</th>
                    <th>Branche</th>
                    <th>Région</th>
                    <th>District</th>
                    <th>Paroisse</th>
                    <th>Date de naissance</th>
                    <th>Téléphone</th>
                    <th>E-mail</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr
                      key={m.id}
                      className="membre-row-link"
                      onClick={(e) => {
                        // Ne pas ouvrir le profil si clic sur checkbox / menu
                        if (e.target.closest('input, button, .row-menu, .col-actions, .col-check')) {
                          return;
                        }
                        openProfil(m);
                      }}
                    >
                      <td className="col-check">
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onChange={() => toggleOne(m.id)}
                          aria-label={`Sélectionner ${m.prenom} ${m.nom}`}
                        />
                      </td>
                      <td className="col-id">#{m.idMembre}</td>
                      <td>
                        <MemberAvatar
                          photoUrl={m.photoUrl}
                          prenom={m.prenom}
                          nom={m.nom}
                          isSuperAdmin={m.isSuperAdmin}
                        />
                      </td>
                      <td className="col-name">
                        <button
                          type="button"
                          className="name-link"
                          onClick={() => openProfil(m)}
                        >
                          {m.prenom} {m.nom}
                        </button>
                      </td>
                      <td>{brancheLabel(m.branche)}</td>
                      <td>{m.region?.nom || '—'}</td>
                      <td>{m.district?.nom || '—'}</td>
                      <td>{m.paroisse?.nom || '—'}</td>
                      <td>{formatDateFr(m.dateNaissance)}</td>
                      <td>{m.contact || '—'}</td>
                      <td className="col-email">{m.email || '—'}</td>
                      <td className="col-actions">{renderActionsMenu(m)}</td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={12} className="muted empty-row">
                        Aucun membre trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-foot membres-pagination">
            <span className="membres-pagination-info" aria-live="polite">
              {total === 0
                ? 'Aucun membre'
                : `${rangeFrom}–${rangeTo} sur ${total} membre${total > 1 ? 's' : ''}`}
              {' · '}
              Page {page} / {totalPages}
            </span>
            <div className="membres-pagination-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goPrev}
                disabled={loading || page <= 1}
              >
                Précédent
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goNext}
                disabled={loading || page >= totalPages}
              >
                Suivant
              </button>
            </div>
          </div>
            </>
          )}
        </div>
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

            {renderMembreForm(false)}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
