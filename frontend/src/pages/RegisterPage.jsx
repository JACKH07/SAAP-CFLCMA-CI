import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { paths } from '../config/env';
import BrandLogo from '../components/BrandLogo';
import DateInputFr from '../components/DateInputFr';
import ProfilePhotoCapture from '../components/ProfilePhotoCapture';
import PasswordInput from '../components/PasswordInput';
import RoleSelect from '../components/RoleSelect';
import './Auth.css';

const INITIAL = {
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
  regionId: '',
  districtId: '',
  paroisseId: '',
  fonctionId: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, logout, loading, error } = useAuthStore();
  const [form, setForm] = useState(INITIAL);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [paroisses, setParoisses] = useState([]);
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [photo, setPhoto] = useState(null);

  const communauteAc = useAutocomplete({
    endpoint: '/communautes',
    params: form.paroisseId ? { paroisseId: form.paroisseId } : {},
  });

  useEffect(() => {
    Promise.all([api.get('/regions'), api.get('/roles?fonctions=true')]).then(([r, rolesRes]) => {
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
      setForm((f) => ({ ...f, districtId: '', paroisseId: '' }));
      setParoisses([]);
      communauteAc.setQuery('');
    });
  }, [form.regionId]);

  useEffect(() => {
    if (!form.districtId) {
      setParoisses([]);
      return;
    }
    api
      .get('/paroisses', { params: { districtId: form.districtId, limit: 100, search: '' } })
      .then((res) => {
        setParoisses(res.data.data || []);
        setForm((f) => ({ ...f, paroisseId: '' }));
        communauteAc.setQuery('');
      });
  }, [form.districtId]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === 'paroisseId') {
      communauteAc.setQuery('');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setMessage('');

    if (!form.paroisseId) {
      setLocalError('Sélectionnez une paroisse');
      return;
    }
    if (!communauteAc.query.trim()) {
      setLocalError('La communauté est obligatoire');
      return;
    }
    if (!form.branche) {
      setLocalError('Sélectionnez Flambeaux ou Lumières');
      return;
    }
    if (!form.dateNaissance) {
      setLocalError('Indiquez la date de naissance au format JJ/MM/AAAA');
      return;
    }

    const paroisse = paroisses.find((p) => String(p.id) === String(form.paroisseId));

    try {
      const data = await register({
        ...form,
        regionId: Number(form.regionId),
        districtId: Number(form.districtId),
        paroisseId: Number(form.paroisseId),
        paroisseNom: paroisse?.nom,
        fonctionId: form.fonctionId ? Number(form.fonctionId) : null,
        communauteNom: communauteAc.query.trim(),
        photo: photo || undefined,
      });
      setMessage(data.message || 'Inscription réussie');
      // Navigation immédiate — plus d’attente artificielle
      navigate(paths.profil, { replace: true });
    } catch {
      /* store */
    }
  }

  return (
    <div className="auth-page auth-page--register">
      <div className="auth-hero auth-hero--compact">
        <BrandLogo size={72} className="auth-logo" />
        <p className="eyebrow">Coordination Flambeaux-Lumières CMA</p>
      </div>

      <form className="card auth-card auth-card--grid" onSubmit={onSubmit} autoComplete="on">
        <div className="form-card-head">
          <h2>Ajouter un nouveau membre</h2>
        </div>

        {(error || localError) && (
          <div className="alert alert-error">{error || localError}</div>
        )}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="form-grid form-grid--4">
          <div className="form-group">
            <label htmlFor="prenom">
              Prénom <span className="req">*</span>
            </label>
            <input
              id="prenom"
              name="prenom"
              autoComplete="given-name"
              value={form.prenom}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="nom">
              Nom de famille <span className="req">*</span>
            </label>
            <input
              id="nom"
              name="nom"
              autoComplete="family-name"
              value={form.nom}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="branche">
              Branche <span className="req">*</span>
            </label>
            <select id="branche" name="branche" value={form.branche} onChange={onChange} required>
              <option value="">Veuillez sélectionner…</option>
              <option value="FLAMBEAUX">Flambeaux (Hommes)</option>
              <option value="LUMIERES">Lumières (Femmes)</option>
            </select>
          </div>
          <div className="form-group form-group--date">
            <label htmlFor="dateNaissance">
              Date de naissance <span className="req">*</span>
            </label>
            <DateInputFr
              id="dateNaissance"
              name="dateNaissance"
              value={form.dateNaissance}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lieuNaissance">
              Lieu de naissance <span className="req">*</span>
            </label>
            <input
              id="lieuNaissance"
              name="lieuNaissance"
              value={form.lieuNaissance}
              onChange={onChange}
              required
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
              <option value="">Veuillez sélectionner…</option>
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
              placeholder="Ex. Enseignant…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={onChange}
              placeholder="exemple@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact">Téléphone</label>
            <input
              id="contact"
              name="contact"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.contact}
              onChange={onChange}
              placeholder="07 XX XX XX XX"
            />
          </div>
          <PasswordInput
            id="password"
            name="password"
            label={
              <>
                Mot de passe <span className="req">*</span>
              </>
            }
            value={form.password}
            onChange={onChange}
            autoComplete="new-password"
            required
            minLength={6}
          />
          <RoleSelect
            id="fonctionId"
            name="fonctionId"
            roles={roles}
            value={form.fonctionId}
            onChange={onChange}
            required
            gradesOnly
          />
          <div className="form-group">
            <label htmlFor="regionId">
              Région <span className="req">*</span>
            </label>
            <select id="regionId" name="regionId" value={form.regionId} onChange={onChange} required>
              <option value="">Veuillez sélectionner…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="districtId">
              District <span className="req">*</span>
            </label>
            <select
              id="districtId"
              name="districtId"
              value={form.districtId}
              onChange={onChange}
              required
              disabled={!form.regionId}
            >
              <option value="">Veuillez sélectionner…</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="paroisseId">
              Paroisse <span className="req">*</span>
            </label>
            <select
              id="paroisseId"
              name="paroisseId"
              value={form.paroisseId}
              onChange={onChange}
              required
              disabled={!form.districtId}
            >
              <option value="">Veuillez sélectionner…</option>
              {paroisses.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group autocomplete">
            <label htmlFor="communaute">
              Communauté <span className="req">*</span>
            </label>
            <input
              id="communaute"
              value={communauteAc.query}
              onChange={(e) => communauteAc.setQuery(e.target.value)}
              onBlur={() => setTimeout(communauteAc.close, 150)}
              placeholder="Saisir ou choisir…"
              required
              disabled={!form.paroisseId}
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

          
          <div className="form-group form-span-2">
            <ProfilePhotoCapture
              value={photo}
              onChange={setPhoto}
              onError={(msg) => setLocalError(msg || '')}
            />
          </div>
        </div>

        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? 'Inscription…' : "S'inscrire"}
        </button>

        <p className="auth-footer muted">
          Déjà inscrit ?{' '}
          <Link
            to={paths.login}
            onClick={() => {
              logout();
            }}
          >
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
