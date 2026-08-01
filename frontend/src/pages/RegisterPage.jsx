import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useAutocomplete } from '../hooks/useAutocomplete';
import BrandLogo from '../components/BrandLogo';
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
  responsabiliteBureau: '',
  regionId: '',
  districtId: '',
  fonctionId: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuthStore();
  const [form, setForm] = useState(INITIAL);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [photo, setPhoto] = useState(null);

  const paroisseAc = useAutocomplete({
    endpoint: '/paroisses',
    params: form.districtId ? { districtId: form.districtId } : {},
  });

  const [paroisseId, setParoisseId] = useState(null);

  const communauteAc = useAutocomplete({
    endpoint: '/communautes',
    params: paroisseId ? { paroisseId } : {},
  });

  useEffect(() => {
    Promise.all([
      api.get('/regions'),
      api.get('/roles?fonctions=true'),
    ]).then(([r, rolesRes]) => {
      setRegions(r.data.data);
      setRoles(rolesRes.data.data);
    });
  }, []);

  useEffect(() => {
    if (!form.regionId) {
      setDistricts([]);
      return;
    }
    api.get(`/regions/${form.regionId}/districts`).then((res) => {
      setDistricts(res.data.data);
      setForm((f) => ({ ...f, districtId: '' }));
      paroisseAc.setQuery('');
      communauteAc.setQuery('');
      setParoisseId(null);
    });
  }, [form.regionId]);

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function onPhotoChange(e) {
    const file = e.target.files?.[0] || null;
    if (file && !file.type.startsWith('image/')) {
      setLocalError('Veuillez choisir une image (JPG, PNG, WEBP)');
      setPhoto(null);
      e.target.value = '';
      return;
    }
    setPhoto(file);
    setLocalError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setMessage('');

    if (!paroisseAc.query.trim() || !communauteAc.query.trim()) {
      setLocalError('Paroisse et communauté sont obligatoires');
      return;
    }
    if (!form.branche) {
      setLocalError('Sélectionnez Flambeaux ou Lumières');
      return;
    }

    try {
      const data = await register({
        ...form,
        regionId: Number(form.regionId),
        districtId: Number(form.districtId),
        fonctionId: form.fonctionId ? Number(form.fonctionId) : null,
        paroisseNom: paroisseAc.query.trim(),
        communauteNom: communauteAc.query.trim(),
        photo: photo || undefined,
      });
      setMessage(data.message);
      setTimeout(() => navigate('/profil'), 800);
    } catch {
      /* store */
    }
  }

  return (
    <div className="auth-page auth-page--register">
      <div className="auth-hero">
        <BrandLogo size={96} className="auth-logo" />
        <p className="eyebrow">Coordination Flambeaux-Lumières CMA</p>
        <h1>Rejoindre CFLCMA-CI</h1>
      </div>

      <form className="card auth-card" onSubmit={onSubmit} autoComplete="on">
        {(error || localError) && (
          <div className="alert alert-error">{error || localError}</div>
        )}
        {message && <div className="alert alert-success">{message}</div>}

        <section className="form-section">
          <h2 className="form-section-title">Identité</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nom">Nom</label>
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
              <label htmlFor="prenom">Prénom</label>
              <input
                id="prenom"
                name="prenom"
                autoComplete="given-name"
                value={form.prenom}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-group form-span-2">
              <label htmlFor="branche">Branche</label>
              <select
                id="branche"
                name="branche"
                value={form.branche}
                onChange={onChange}
                required
              >
                <option value="">Sélectionner…</option>
                <option value="FLAMBEAUX">Flambeaux (Hommes)</option>
                <option value="LUMIERES">Lumières (Femmes)</option>
              </select>
            </div>
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
          <h2 className="form-section-title">Coordonnées</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="contact">Contact</label>
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
            <div className="form-group">
              <label htmlFor="email">Email (optionnel)</label>
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
            <div className="form-group form-span-2">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={onChange}
                required
                minLength={6}
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
                placeholder="Ex. Enseignant, Commerçant…"
              />
            </div>
            <div className="form-group form-span-2">
              <label htmlFor="responsabiliteBureau">Responsabilité dans le bureau</label>
              <input
                id="responsabiliteBureau"
                name="responsabiliteBureau"
                value={form.responsabiliteBureau}
                onChange={onChange}
                placeholder="Ex. Secrétaire, Trésorier…"
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Localisation CMA</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="regionId">Région</label>
              <select
                id="regionId"
                name="regionId"
                value={form.regionId}
                onChange={onChange}
                required
              >
                <option value="">Sélectionner…</option>
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
                required
                disabled={!form.regionId}
              >
                <option value="">Sélectionner…</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group form-span-2 autocomplete">
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
                required
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
            <div className="form-group form-span-2 autocomplete">
              <label htmlFor="communaute">Communauté CMA</label>
              <input
                id="communaute"
                value={communauteAc.query}
                onChange={(e) => communauteAc.setQuery(e.target.value)}
                onBlur={() => setTimeout(communauteAc.close, 150)}
                placeholder="Saisir ou choisir…"
                required
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
            <div className="form-group form-span-2">
              <label htmlFor="fonctionId">Titre (optionnel)</label>
              <select
                id="fonctionId"
                name="fonctionId"
                value={form.fonctionId}
                onChange={onChange}
              >
                <option value="">Sélectionner…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="form-group">
          <label htmlFor="photo">Photo de profil (image / prise de vue)</label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
          />
          {photo && (
            <p className="muted file-chosen" style={{ margin: 0, fontSize: '0.85rem' }}>
              Fichier : {photo.name}
            </p>
          )}
        </div>

        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? 'Inscription…' : "S'inscrire"}
        </button>

        <p className="auth-footer muted">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
