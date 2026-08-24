import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import DateInputFr from '../../components/DateInputFr';
import PasswordInput from '../../components/PasswordInput';
import RoleSelect from '../../components/RoleSelect';
import ComboboxField from '../../components/ComboboxField';
import './AdminPages.css';

const RESPONSABILITES = [
  'Président',
  'Vice-président',
  'Secrétaire',
  'Secrétaire adjoint',
  'Trésorier',
  'Trésorier adjoint',
  'Chargé de communication',
  'Chargé de formation',
  'Chargé d’évangélisation',
  'Conseiller',
  'Autre',
];

const EMPTY_CREATE = {
  prenom: '',
  nom: '',
  branche: '',
  dateNaissance: '',
  lieuNaissance: '',
  contact: '',
  email: '',
  password: '',
  roleId: '',
  titreId: '',
  regionId: '',
  districtId: '',
  situationMatrimoniale: '',
  profession: '',
  responsabilite: '',
  responsabiliteAutre: '',
};

function resolveResponsabilite(form) {
  if (form.responsabilite === 'Autre') return form.responsabiliteAutre.trim();
  return form.responsabilite.trim();
}

function ResponsabiliteFields({ form, setForm, idPrefix }) {
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-resp`}>
          Responsabilité dans le bureau <span className="req">*</span>
        </label>
        <select
          id={`${idPrefix}-resp`}
          value={form.responsabilite}
          onChange={(e) => setForm((f) => ({ ...f, responsabilite: e.target.value }))}
          required
        >
          <option value="">Choisir…</option>
          {RESPONSABILITES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {form.responsabilite === 'Autre' && (
        <div className="form-group">
          <label htmlFor={`${idPrefix}-resp-autre`}>Préciser la responsabilité</label>
          <input
            id={`${idPrefix}-resp-autre`}
            value={form.responsabiliteAutre}
            onChange={(e) => setForm((f) => ({ ...f, responsabiliteAutre: e.target.value }))}
            placeholder="Ex. Chargé de la jeunesse…"
            required
          />
        </div>
      )}
    </>
  );
}

export default function AdminBureauPage() {
  const [mode, setMode] = useState('create');
  const [membres, setMembres] = useState([]);
  const [bureauList, setBureauList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [membreSearch, setMembreSearch] = useState('');
  const [paroisseId, setParoisseId] = useState(null);
  const [regionNom, setRegionNom] = useState('');
  const [districtNom, setDistrictNom] = useState('');
  const [paroisses, setParoisses] = useState([]);
  const [paroisseNom, setParoisseNom] = useState('');
  const [communautes, setCommunautes] = useState([]);
  const [communauteNom, setCommunauteNom] = useState('');

  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [assignForm, setAssignForm] = useState({
    membreId: '',
    responsabilite: '',
    responsabiliteAutre: '',
  });

  async function load() {
    setError('');
    setLoading(true);
    try {
      const [bureauRes, candidatsRes] = await Promise.all([
        api.get('/membres', { params: { limit: 500, bureau: true } }),
        api.get('/membres', { params: { limit: 100, statut: 'VALIDE' } }),
      ]);
      setBureauList(bureauRes.data.items || []);
      setMembres(candidatsRes.data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    Promise.all([api.get('/roles'), api.get('/regions')]).then(([rolesRes, regionsRes]) => {
      setRoles(rolesRes.data.data || []);
      setRegions(regionsRes.data.data || []);
    });
  }, []);

  useEffect(() => {
    if (!createForm.regionId) {
      setDistricts([]);
      return;
    }
    api.get(`/regions/${createForm.regionId}/districts`).then((res) => {
      setDistricts(res.data.data || []);
    });
  }, [createForm.regionId]);

  useEffect(() => {
    if (!createForm.districtId) {
      setParoisses([]);
      return;
    }
    api
      .get('/paroisses', { params: { districtId: createForm.districtId, limit: 100 } })
      .then((res) => setParoisses(res.data.data || []))
      .catch(() => setParoisses([]));
  }, [createForm.districtId]);

  useEffect(() => {
    if (!paroisseId) {
      setCommunautes([]);
      return;
    }
    api
      .get('/communautes', { params: { paroisseId, limit: 100 } })
      .then((res) => setCommunautes(res.data.data || []))
      .catch(() => setCommunautes([]));
  }, [paroisseId]);

  const bureauMembres = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bureauList.filter((m) => {
      if (!m.responsabiliteBureau?.trim()) return false;
      if (!q) return true;
      const hay = [
        m.prenom,
        m.nom,
        m.idMembre,
        m.contact,
        m.responsabiliteBureau,
        m.region?.nom,
        m.district?.nom,
        m.paroisse?.nom,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bureauList, search]);

  const candidats = useMemo(() => {
    const q = membreSearch.trim().toLowerCase();
    return membres.filter((m) => {
      if (m.responsabiliteBureau?.trim()) return false;
      if (!q) return true;
      const hay = `${m.prenom} ${m.nom} ${m.idMembre}`.toLowerCase();
      return hay.includes(q);
    });
  }, [membres, membreSearch]);

  function onCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'regionId') {
        next.districtId = '';
        setRegionNom('');
        setDistrictNom('');
        setParoisseId(null);
        setParoisseNom('');
        setParoisses([]);
        setCommunauteNom('');
        setCommunautes([]);
      }
      if (name === 'districtId') {
        setParoisseId(null);
        setParoisseNom('');
        setCommunauteNom('');
      }
      return next;
    });
  }

  async function onCreate(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    const responsabiliteBureau = resolveResponsabilite(createForm);
    if (!responsabiliteBureau) {
      setError('Indiquez la responsabilité dans le bureau');
      return;
    }
    setSaving(true);
    try {
      await api.post('/membres', {
        prenom: createForm.prenom.trim(),
        nom: createForm.nom.trim(),
        branche: createForm.branche,
        dateNaissance: createForm.dateNaissance,
        lieuNaissance: createForm.lieuNaissance.trim(),
        contact: createForm.contact.trim() || null,
        email: createForm.email.trim() || null,
        password: createForm.password,
        roleId: Number(createForm.roleId),
        titreId: createForm.titreId ? Number(createForm.titreId) : null,
        regionId: createForm.regionId ? Number(createForm.regionId) : null,
        districtId: createForm.districtId ? Number(createForm.districtId) : null,
        districtNom: districtNom.trim() || undefined,
        paroisseId: paroisseId || undefined,
        paroisseNom: paroisseNom.trim() || undefined,
        communauteId: undefined,
        communauteNom: communauteNom.trim() || undefined,
        situationMatrimoniale: createForm.situationMatrimoniale || null,
        profession: createForm.profession.trim() || null,
        responsabiliteBureau,
        statut: 'VALIDE',
      });
      setMsg('Membre du bureau créé');
      setCreateForm(EMPTY_CREATE);
      setParoisseId(null);
      setRegionNom('');
      setDistrictNom('');
      setParoisseNom('');
      setParoisses([]);
      setCommunauteNom('');
      setCommunautes([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création');
    } finally {
      setSaving(false);
    }
  }

  async function onAssign(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    const responsabiliteBureau = resolveResponsabilite(assignForm);
    if (!assignForm.membreId || !responsabiliteBureau) {
      setError('Choisissez un membre et une responsabilité bureau');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/membres/${assignForm.membreId}`, { responsabiliteBureau });
      setMsg('Membre ajouté au bureau');
      setAssignForm({ membreId: '', responsabilite: '', responsabiliteAutre: '' });
      setMembreSearch('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de l’ajout');
    } finally {
      setSaving(false);
    }
  }

  async function removeFromBureau(id) {
    setMsg('');
    setError('');
    try {
      await api.patch(`/membres/${id}`, { responsabiliteBureau: null });
      setMsg('Membre retiré du bureau');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec du retrait');
    }
  }

  return (
    <AdminShell title="Bureau" crumbs={['Administration', 'Bureau']}>
      <section className="admin-page">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card bureau-list-card">
          <div className="card-head-simple">
            <h2>Membres du bureau</h2>
            <p className="muted">{bureauMembres.length} membre(s) désigné(s)</p>
          </div>
          <div className="form-group">
            <label htmlFor="bureau-search">Recherche</label>
            <input
              id="bureau-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, responsabilité, région…"
            />
          </div>
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : bureauMembres.length === 0 ? (
            <p className="muted">Aucun membre dans le bureau. Ajoutez-en via le formulaire ci-dessous.</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table data-table-responsive">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Responsabilité</th>
                    <th>Contact</th>
                    <th>Branche</th>
                    <th>Région</th>
                    <th>District</th>
                    <th>Paroisse</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bureauMembres.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Membre">
                        <strong>
                          {m.prenom} {m.nom}
                        </strong>
                        <div className="muted tiny">{m.idMembre}</div>
                      </td>
                      <td data-label="Responsabilité">{m.responsabiliteBureau}</td>
                      <td data-label="Contact">{m.contact || '—'}</td>
                      <td data-label="Branche">{m.branche === 'LUMIERES' ? 'Lumières' : 'Flambeaux'}</td>
                      <td data-label="Région">{m.region?.nom || '—'}</td>
                      <td data-label="District">{m.district?.nom || '—'}</td>
                      <td data-label="Paroisse">{m.paroisse?.nom || '—'}</td>
                      <td className="actions-cell" data-label="Action">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeFromBureau(m.id)}
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card bureau-form-card">
          <div className="card-head-simple">
            <h2>Ajouter un membre du bureau</h2>
            <p className="muted">
              Créez un nouveau membre ou désignez un membre déjà validé pour une responsabilité bureau.
            </p>
          </div>

          <div className="bureau-mode-tabs" role="tablist" aria-label="Mode d’ajout">
            <button
              type="button"
              role="tab"
              className={mode === 'create' ? 'active' : ''}
              aria-selected={mode === 'create'}
              onClick={() => setMode('create')}
            >
              Nouveau membre
            </button>
            <button
              type="button"
              role="tab"
              className={mode === 'assign' ? 'active' : ''}
              aria-selected={mode === 'assign'}
              onClick={() => setMode('assign')}
            >
              Désigner un membre existant
            </button>
          </div>

          {mode === 'create' ? (
            <form className="bureau-form" onSubmit={onCreate}>
              <div className="bureau-form-grid">
                <div className="form-group">
                  <label htmlFor="bureau-prenom">
                    Prénom <span className="req">*</span>
                  </label>
                  <input
                    id="bureau-prenom"
                    name="prenom"
                    value={createForm.prenom}
                    onChange={onCreateChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-nom">
                    Nom <span className="req">*</span>
                  </label>
                  <input
                    id="bureau-nom"
                    name="nom"
                    value={createForm.nom}
                    onChange={onCreateChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-branche">
                    Branche <span className="req">*</span>
                  </label>
                  <select
                    id="bureau-branche"
                    name="branche"
                    value={createForm.branche}
                    onChange={onCreateChange}
                    required
                  >
                    <option value="">Sélectionner…</option>
                    <option value="FLAMBEAUX">Flambeaux (Hommes)</option>
                    <option value="LUMIERES">Lumières (Femmes)</option>
                  </select>
                </div>
                <div className="form-group form-group--date">
                  <label htmlFor="bureau-naissance">
                    Date de naissance <span className="req">*</span>
                  </label>
                  <DateInputFr
                    id="bureau-naissance"
                    name="dateNaissance"
                    value={createForm.dateNaissance}
                    onChange={onCreateChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-lieu">
                    Lieu de naissance <span className="req">*</span>
                  </label>
                  <input
                    id="bureau-lieu"
                    name="lieuNaissance"
                    value={createForm.lieuNaissance}
                    onChange={onCreateChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-contact">Contact</label>
                  <input
                    id="bureau-contact"
                    name="contact"
                    value={createForm.contact}
                    onChange={onCreateChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-email">Email</label>
                  <input
                    id="bureau-email"
                    name="email"
                    type="email"
                    value={createForm.email}
                    onChange={onCreateChange}
                  />
                </div>
                <PasswordInput
                  id="bureau-password"
                  name="password"
                  label={
                    <>
                      Mot de passe <span className="req">*</span>
                    </>
                  }
                  value={createForm.password}
                  onChange={onCreateChange}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <div className="bureau-role-fields">
                  <RoleSelect
                    id="bureau-role"
                    name="roleId"
                    titreName="titreId"
                    roles={roles}
                    value={createForm.roleId}
                    titreValue={createForm.titreId}
                    onChange={onCreateChange}
                    required
                  />
                </div>
                <ResponsabiliteFields
                  form={createForm}
                  setForm={setCreateForm}
                  idPrefix="create"
                />
                <div className="form-group">
                  <label htmlFor="bureau-situation">Situation matrimoniale</label>
                  <select
                    id="bureau-situation"
                    name="situationMatrimoniale"
                    value={createForm.situationMatrimoniale}
                    onChange={onCreateChange}
                  >
                    <option value="">Sélectionner…</option>
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-profession">Profession</label>
                  <input
                    id="bureau-profession"
                    name="profession"
                    value={createForm.profession}
                    onChange={onCreateChange}
                  />
                </div>
                <ComboboxField
                  id="bureau-region"
                  label="Région"
                  value={regionNom}
                  selectedId={createForm.regionId}
                  items={regions}
                  allowCreate={false}
                  emptyListLabel="Aucune région"
                  onChange={(value) => {
                    setRegionNom(value);
                    const match = regions.find(
                      (r) => r.nom.toLowerCase() === value.trim().toLowerCase()
                    );
                    const nextId = match ? String(match.id) : '';
                    const changed = String(createForm.regionId) !== nextId;
                    setCreateForm((f) => ({ ...f, regionId: nextId, ...(changed ? { districtId: '' } : {}) }));
                    if (changed) {
                      setDistrictNom('');
                      setParoisseId(null);
                      setParoisseNom('');
                      setParoisses([]);
                      setCommunauteNom('');
                      setCommunautes([]);
                    }
                  }}
                  onSelect={(item) => {
                    const changed = String(createForm.regionId) !== String(item.id);
                    setRegionNom(item.nom);
                    setCreateForm((f) => ({
                      ...f,
                      regionId: String(item.id),
                      ...(changed ? { districtId: '' } : {}),
                    }));
                    if (changed) {
                      setDistrictNom('');
                      setParoisseId(null);
                      setParoisseNom('');
                      setParoisses([]);
                      setCommunauteNom('');
                      setCommunautes([]);
                    }
                  }}
                />
                <ComboboxField
                  id="bureau-district"
                  label="District"
                  value={districtNom}
                  selectedId={createForm.districtId}
                  items={districts}
                  disabled={!createForm.regionId}
                  emptyListLabel="Aucun district dans cette région"
                  onChange={(value) => {
                    setDistrictNom(value);
                    const match = districts.find(
                      (d) => d.nom.toLowerCase() === value.trim().toLowerCase()
                    );
                    setCreateForm((f) => ({ ...f, districtId: match ? String(match.id) : '' }));
                    setParoisseId(null);
                    setParoisseNom('');
                    setCommunauteNom('');
                  }}
                  onSelect={(item) => {
                    setDistrictNom(item.nom);
                    setCreateForm((f) => ({ ...f, districtId: String(item.id) }));
                    setParoisseId(null);
                    setParoisseNom('');
                    setCommunauteNom('');
                  }}
                />
                <ComboboxField
                  id="bureau-paroisse"
                  label="Paroisse"
                  value={paroisseNom}
                  selectedId={paroisseId || ''}
                  items={paroisses}
                  disabled={!createForm.districtId && !districtNom.trim()}
                  emptyListLabel="Aucune paroisse dans ce district"
                  onChange={(value) => {
                    setParoisseNom(value);
                    const match = paroisses.find(
                      (p) => p.nom.toLowerCase() === value.trim().toLowerCase()
                    );
                    setParoisseId(match ? match.id : null);
                    setCommunauteNom('');
                  }}
                  onSelect={(item) => {
                    setParoisseNom(item.nom);
                    setParoisseId(item.id);
                    setCommunauteNom('');
                  }}
                />
                <ComboboxField
                  id="bureau-communaute"
                  label="Communauté"
                  value={communauteNom}
                  items={communautes}
                  disabled={!paroisseNom.trim()}
                  emptyListLabel="Aucune communauté dans cette paroisse"
                  onChange={setCommunauteNom}
                  onSelect={(item) => setCommunauteNom(item.nom)}
                />
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Créer le membre du bureau'}
                </button>
              </div>
            </form>
          ) : (
            <form className="bureau-form" onSubmit={onAssign}>
              <div className="bureau-form-grid bureau-form-grid--assign">
                <div className="form-group">
                  <label htmlFor="bureau-membre-search">Rechercher un membre</label>
                  <input
                    id="bureau-membre-search"
                    value={membreSearch}
                    onChange={(e) => setMembreSearch(e.target.value)}
                    placeholder="Nom, prénom ou ID…"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bureau-membre">
                    Membre <span className="req">*</span>
                  </label>
                  <select
                    id="bureau-membre"
                    value={assignForm.membreId}
                    onChange={(e) => setAssignForm((f) => ({ ...f, membreId: e.target.value }))}
                    required
                  >
                    <option value="">Choisir…</option>
                    {candidats.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.prenom} {m.nom} ({m.idMembre})
                      </option>
                    ))}
                  </select>
                </div>
                <ResponsabiliteFields
                  form={assignForm}
                  setForm={setAssignForm}
                  idPrefix="assign"
                />
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Ajout…' : 'Ajouter au bureau'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
