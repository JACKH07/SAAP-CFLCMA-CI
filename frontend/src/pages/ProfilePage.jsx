import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import BrandLogo from '../components/BrandLogo';
import PasswordInput from '../components/PasswordInput';
import MemberAvatar from '../components/MemberAvatar';
import ProfilePhotoCapture from '../components/ProfilePhotoCapture';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import './Auth.css';
import './ProfilePage.css';

function statutBadge(statut) {
  const map = {
    VALIDE: 'badge-valide',
    EN_ATTENTE: 'badge-en_attente',
    REJETE: 'badge-attente',
    SUSPENDU: 'badge-attente',
  };
  return map[statut] || 'badge-attente';
}

function brancheLabel(branche) {
  if (branche === 'LUMIERES') return 'Lumières (Femme)';
  if (branche === 'FLAMBEAUX') return 'Flambeaux (Homme)';
  return '—';
}

function rattachement(profile) {
  return [
    profile.region?.nom,
    profile.district?.nom,
    profile.paroisse?.nom,
    profile.communaute?.nom,
  ]
    .filter(Boolean)
    .join(' · ') || '—';
}

const EMPTY_FORM = {
  contact: '',
  email: '',
  situationMatrimoniale: '',
  profession: '',
  responsabiliteBureau: '',
  lieuNaissance: '',
  password: '',
  confirm: '',
};

export default function ProfilePage() {
  const { user, refreshMe, setSession, token } = useAuthStore();
  const [profile, setProfile] = useState(user);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    refreshMe()
      .then((p) => {
        if (p) setProfile(p);
      })
      .catch(() => {});
  }, []);

  function startEdit() {
    if (!profile) return;
    setError('');
    setMsg('');
    setForm({
      contact: profile.contact || '',
      email: profile.email || '',
      situationMatrimoniale: profile.situationMatrimoniale || '',
      profession: profile.profession || '',
      responsabiliteBureau: profile.responsabiliteBureau || '',
      lieuNaissance: profile.lieuNaissance || '',
      password: '',
      confirm: '',
    });
    setEditing(true);
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!profile?.id) return;
    setError('');
    setMsg('');

    if (form.password) {
      if (form.password.length < 6) {
        setError('Mot de passe : 6 caractères minimum');
        return;
      }
      if (form.password !== form.confirm) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    }

    const payload = {
      contact: form.contact.trim() || null,
      email: form.email.trim() || null,
      situationMatrimoniale: form.situationMatrimoniale.trim() || null,
      profession: form.profession.trim() || null,
      responsabiliteBureau: form.responsabiliteBureau.trim() || null,
      lieuNaissance: form.lieuNaissance.trim() || undefined,
    };
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      const { data } = await api.patch(`/membres/${profile.id}`, payload);
      const updated = data.data;
      setProfile(updated);
      if (token) setSession(token, updated);
      setEditing(false);
      setMsg('Profil mis à jour');
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(e) {
    e.preventDefault();
    if (!photoFile || !profile?.id) return;

    setPhotoError('');
    setMsg('');
    setPhotoSaving(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const { data } = await api.patch(`/membres/${profile.id}/photo`, fd);
      setProfile(data.data);
      if (token) setSession(token, data.data);
      setPhotoFile(null);
      setShowPhotoEditor(false);
      setMsg(data.message || 'Photo mise à jour');
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Échec de l\'envoi de la photo');
    } finally {
      setPhotoSaving(false);
    }
  }

  function printFiche() {
    window.print();
  }

  if (!profile) return null;

  const dateNaiss = profile.dateNaissance
    ? new Date(profile.dateNaissance).toLocaleDateString('fr-FR')
    : '—';

  const isMemberAccount = profile && !hasAdminAccess(profile);

  return (
    <Layout>
      <section className="stack profile-page">
        <div className="profile-header no-print">
          {isMemberAccount && (
            <MemberAvatar
              photoUrl={profile.photoUrl}
              prenom={profile.prenom}
              nom={profile.nom}
              className="profile-photo"
              alt={`${profile.prenom} ${profile.nom}`}
            />
          )}
          <p className="muted" style={{ margin: 0 }}>
            Mon profil
          </p>
          <h1>
            {profile.prenom} {profile.nom}
          </h1>
          <span className={`badge ${statutBadge(profile.statut)}`}>
            {profile.statut.replace('_', ' ')}
          </span>

          <div className="profile-actions">
            {!editing && (
              <button type="button" className="btn btn-secondary" onClick={startEdit}>
                Modifier
              </button>
            )}
            <button type="button" className="btn" onClick={printFiche}>
              Imprimer la fiche
            </button>
          </div>
        </div>

        {msg && <div className="alert alert-success no-print">{msg}</div>}
        {error && <div className="alert alert-error no-print">{error}</div>}

        {isMemberAccount && (
          <div className="card no-print profile-photo-section">
            {!showPhotoEditor ? (
              <>
                <h2 className="profile-edit-title">Photo de profil</h2>
                <p className="muted profile-photo-section__hint">
                  {profile.photoUrl
                    ? 'Vous pouvez remplacer votre photo d\'identité.'
                    : 'Ajoutez votre photo d\'identité pour compléter votre fiche membre.'}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPhotoError('');
                    setShowPhotoEditor(true);
                  }}
                >
                  {profile.photoUrl ? 'Changer ma photo' : 'Ajouter ma photo'}
                </button>
              </>
            ) : (
              <form onSubmit={uploadPhoto}>
                <h2 className="profile-edit-title">Nouvelle photo</h2>
                <ProfilePhotoCapture
                  value={photoFile}
                  onChange={setPhotoFile}
                  onError={setPhotoError}
                />
                {photoError && <div className="alert alert-error">{photoError}</div>}
                <div className="profile-actions">
                  <button type="submit" className="btn" disabled={!photoFile || photoSaving}>
                    {photoSaving ? 'Envoi…' : 'Enregistrer la photo'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowPhotoEditor(false);
                      setPhotoFile(null);
                      setPhotoError('');
                    }}
                    disabled={photoSaving}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {editing ? (
          <form className="card no-print" onSubmit={saveProfile}>
            <h2 className="profile-edit-title">Modifier mon profil</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pf-contact">Contact</label>
                <input
                  id="pf-contact"
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pf-email">E-mail</label>
                <input
                  id="pf-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pf-lieu">Lieu de naissance</label>
                <input
                  id="pf-lieu"
                  value={form.lieuNaissance}
                  onChange={(e) => setForm((f) => ({ ...f, lieuNaissance: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pf-situ">Situation matrimoniale</label>
                <select
                  id="pf-situ"
                  value={form.situationMatrimoniale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, situationMatrimoniale: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Fiancé(e)">Fiancé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pf-pro">Profession</label>
                <input
                  id="pf-pro"
                  value={form.profession}
                  onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pf-bur">Responsabilité bureau</label>
                <input
                  id="pf-bur"
                  value={form.responsabiliteBureau}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, responsabiliteBureau: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <PasswordInput
                id="pf-pwd"
                name="password"
                label="Nouveau mot de passe (optionnel)"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                autoComplete="new-password"
              />
              <PasswordInput
                id="pf-pwd2"
                name="confirm"
                label="Confirmer"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="profile-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="card no-print">
            <div className="stack">
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  ID membre
                </div>
                <strong style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
                  {profile.idMembre}
                </strong>
              </div>
              <div className="form-row" style={{ gap: '1rem' }}>
                <div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Branche
                  </div>
                  <div>{brancheLabel(profile.branche)}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Titre
                  </div>
                  <div>{profile.role?.nom || 'Membres actifs'}</div>
                </div>
              </div>
              <div className="form-row" style={{ gap: '1rem' }}>
                <div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Contact
                  </div>
                  <div>{profile.contact || '—'}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Situation matrimoniale
                  </div>
                  <div>{profile.situationMatrimoniale || '—'}</div>
                </div>
              </div>
              <div className="form-row" style={{ gap: '1rem' }}>
                <div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Profession
                  </div>
                  <div>{profile.profession || '—'}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Responsabilité dans le bureau
                  </div>
                  <div>{profile.responsabiliteBureau || '—'}</div>
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  Rattachement
                </div>
                <div>{rattachement(profile)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Fiche imprimable */}
        <div className="fiche-print" ref={printRef}>
          <div className="fiche-print-head">
            <BrandLogo size={72} />
            <div>
              <strong>COORDINATION FLAMBEAUX-LUMIÈRES CMA</strong>
              <div>Côte d&apos;Ivoire — SAAP CFLCMA-CI</div>
              <h2>Fiche d&apos;inscription membre</h2>
            </div>
          </div>

          <div className="fiche-print-grid">
            <div>
              <span>Nom</span>
              <strong>{profile.nom}</strong>
            </div>
            <div>
              <span>Prénom</span>
              <strong>{profile.prenom}</strong>
            </div>
            <div>
              <span>ID membre</span>
              <strong>{profile.idMembre}</strong>
            </div>
            <div>
              <span>Statut</span>
              <strong>{profile.statut}</strong>
            </div>
            <div>
              <span>Branche</span>
              <strong>{brancheLabel(profile.branche)}</strong>
            </div>
            <div>
              <span>Titre</span>
              <strong>{profile.role?.nom || 'Membres actifs'}</strong>
            </div>
            <div>
              <span>Date de naissance</span>
              <strong>{dateNaiss}</strong>
            </div>
            <div>
              <span>Lieu de naissance</span>
              <strong>{profile.lieuNaissance || '—'}</strong>
            </div>
            <div>
              <span>Contact</span>
              <strong>{profile.contact || '—'}</strong>
            </div>
            <div>
              <span>E-mail</span>
              <strong>{profile.email || '—'}</strong>
            </div>
            <div>
              <span>Situation matrimoniale</span>
              <strong>{profile.situationMatrimoniale || '—'}</strong>
            </div>
            <div>
              <span>Profession</span>
              <strong>{profile.profession || '—'}</strong>
            </div>
            <div className="fiche-span-2">
              <span>Responsabilité bureau</span>
              <strong>{profile.responsabiliteBureau || '—'}</strong>
            </div>
            <div className="fiche-span-2">
              <span>Rattachement</span>
              <strong>{rattachement(profile)}</strong>
            </div>
          </div>

          <div className="fiche-print-foot">
            <div>
              <span>Signature du membre</span>
              <div className="fiche-sign-line" />
            </div>
            <div>
              <span>Visa coordination</span>
              <div className="fiche-sign-line" />
            </div>
          </div>
          <p className="fiche-print-date">
            Imprimé le {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </section>
    </Layout>
  );
}
