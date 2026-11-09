import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import BrandLogo from '../components/BrandLogo';
import PasswordInput from '../components/PasswordInput';
import MemberAvatar from '../components/MemberAvatar';
import ProfilePhotoCapture from '../components/ProfilePhotoCapture';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { titreNom, gradeNom, rankProgress } from '../utils/roleDisplay';
import './Auth.css';
import './ProfilePage.css';

function statutLabel(statut) {
  const map = {
    VALIDE: 'Validé',
    EN_ATTENTE: 'En attente',
    REJETE: 'Rejeté',
    SUSPENDU: 'Suspendu',
  };
  return map[statut] || statut?.replace('_', ' ') || '—';
}

function brancheLabel(branche, short = false) {
  if (branche === 'LUMIERES') return short ? 'Lumières' : 'Lumières (Femme)';
  if (branche === 'FLAMBEAUX') return short ? 'Flambeaux' : 'Flambeaux (Homme)';
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

function roleSubtitle(profile) {
  return brancheLabel(profile.branche, true);
}

const TABS = [
  { id: 'identite', label: 'Identité' },
  { id: 'organisation', label: 'Organisation' },
];

const EMPTY_FORM = {
  contact: '',
  email: '',
  situationMatrimoniale: '',
  profession: '',
  lieuNaissance: '',
  password: '',
  confirm: '',
};

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"
      />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
      />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.3V21h3.8L17.8 9.9l-3.8-3.8L3 17.3ZM20.7 7c.4-.4.4-1 0-1.4l-2.3-2.3c-.4-.4-1-.4-1.4 0l-1.8 1.8 3.8 3.8L20.7 7Z"
      />
    </svg>
  );
}

function IconBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 9.2 8.1 2.5 9l5 4.9L6.2 21 12 17.8 17.8 21 16.5 13.9l5-4.9-6.7-.9L12 2Z"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8Z"
      />
    </svg>
  );
}

function IconIdCard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 14H4V6h16v12ZM6 10h5v5H6v-5Zm7 0h5v2h-5v-2Zm0 3h5v2h-5v-2Z"
      />
    </svg>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="profile-field">
      <div className="profile-field-label">{label}</div>
      <div className="profile-field-value">{value || '—'}</div>
    </div>
  );
}

function SheetTitle({ icon, children }) {
  return (
    <h2 className="profile-sheet-title">
      <span className="profile-sheet-title-icon">{icon}</span>
      {children}
    </h2>
  );
}

function ContactRow({ icon, label, value }) {
  return (
    <div className="profile-contact-row">
      <span className="profile-contact-icon">{icon}</span>
      <div>
        <div className="profile-contact-label">{label}</div>
        <div className="profile-contact-value">{value || '—'}</div>
      </div>
    </div>
  );
}

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
  const [tab, setTab] = useState('identite');
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

  function openPhotoEditor() {
    setPhotoError('');
    setShowPhotoEditor(true);
  }

  function printFiche() {
    window.print();
  }

  if (!profile) return null;

  const dateNaiss = profile.dateNaissance
    ? new Date(profile.dateNaissance).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const isMemberAccount = profile && !profile.isSuperAdmin;
  const progress = rankProgress(profile);
  const badges = [
    profile.branche
      ? {
          key: 'branche',
          label: brancheLabel(profile.branche, true),
          kind: profile.branche === 'LUMIERES' ? 'lumieres' : 'flambeaux',
        }
      : null,
    profile.statut ? { key: 'statut', label: statutLabel(profile.statut), kind: profile.statut === 'VALIDE' ? 'ok' : 'warn' } : null,
    profile.responsabiliteBureau
      ? { key: 'bureau', label: profile.responsabiliteBureau, kind: 'bureau' }
      : null,
  ].filter(Boolean);

  return (
    <Layout>
      <section className="stack profile-page">
        {msg && <div className="alert alert-success no-print">{msg}</div>}
        {error && <div className="alert alert-error no-print">{error}</div>}

        <article className="profile-identity no-print">
          {isMemberAccount ? (
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={openPhotoEditor}
              aria-label={profile.photoUrl ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
            >
              <MemberAvatar
                photoUrl={profile.photoUrl}
                prenom={profile.prenom}
                nom={profile.nom}
                isSuperAdmin={profile.isSuperAdmin}
                className="profile-photo"
                alt={`${profile.prenom} ${profile.nom}`}
              />
            </button>
          ) : (
            <MemberAvatar
              photoUrl={profile.photoUrl}
              prenom={profile.prenom}
              nom={profile.nom}
              isSuperAdmin={profile.isSuperAdmin}
              className="profile-photo"
              alt={`${profile.prenom} ${profile.nom}`}
            />
          )}
          <h1 className="profile-identity-name">
            {profile.prenom} {profile.nom}
          </h1>
          <p className="profile-identity-role">{roleSubtitle(profile)}</p>
          <div className="profile-id-badge">
            <IconBadge />
            <span>ID : {profile.idMembre}</span>
          </div>
        </article>

        {isMemberAccount && showPhotoEditor && (
          <form className="card no-print profile-sheet" onSubmit={uploadPhoto}>
            <h2 className="profile-sheet-title">Photo de profil</h2>
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

        {editing ? (
          <form className="card no-print profile-sheet" onSubmit={saveProfile}>
            <h2 className="profile-sheet-title">Modifier mon profil</h2>
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
          <>
            <div className="profile-tabs no-print" role="tablist" aria-label="Sections du profil">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`profile-tab${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'identite' ? (
              <>
                <article className="card profile-sheet no-print">
                  <SheetTitle icon={<IconUser />}>Identité</SheetTitle>
                  <FieldRow label="Date de naissance" value={dateNaiss} />
                  <FieldRow label="Lieu de naissance" value={profile.lieuNaissance} />
                  <FieldRow label="État civil" value={profile.situationMatrimoniale} />
                  <FieldRow label="Profession" value={profile.profession} />
                </article>

                <article className="card profile-sheet no-print">
                  <SheetTitle icon={<IconIdCard />}>Contact</SheetTitle>
                  <ContactRow icon={<IconMail />} label="Email" value={profile.email} />
                  <ContactRow icon={<IconPhone />} label="Téléphone" value={profile.contact} />
                </article>
              </>
            ) : (
              <>
                <article className="card profile-sheet no-print">
                  <SheetTitle icon={<IconPin />}>Organisation</SheetTitle>
                  <FieldRow label="Région" value={profile.region?.nom} />
                  <FieldRow label="District" value={profile.district?.nom} />
                  <FieldRow label="Paroisse" value={profile.paroisse?.nom} />
                  <FieldRow label="Communauté" value={profile.communaute?.nom} />
                </article>

                <article className="card profile-sheet no-print">
                  <SheetTitle icon={<IconBadge />}>Statut dans le mouvement</SheetTitle>
                  <FieldRow label="Titre" value={titreNom(profile.role, profile.titre)} />
                  <FieldRow label="Grade" value={gradeNom(profile.role)} />
                  <FieldRow
                    label="Responsabilité bureau"
                    value={profile.responsabiliteBureau}
                  />
                  <FieldRow label="Statut" value={statutLabel(profile.statut)} />
                  <div
                    className="profile-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.pct}
                    aria-label="Progression vers le rang suivant"
                  >
                    <span style={{ width: `${progress.pct}%` }} />
                  </div>
                  <p className="profile-progress-label">
                    {progress.isTop
                      ? 'Rang le plus élevé du mouvement'
                      : `${progress.pct}% vers ${progress.nextShort || progress.nextNom}`}
                  </p>
                  {badges.length > 0 && (
                    <div className="profile-badges">
                      <span className="profile-badges-label">Badges</span>
                      <div className="profile-badge-list">
                        {badges.map((b) => (
                          <span key={b.key} className={`profile-chip profile-chip--${b.kind}`}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              </>
            )}

            <div className="profile-cta no-print">
              <button type="button" className="profile-edit-cta" onClick={startEdit}>
                <IconPencil />
                Modifier le profil
              </button>
              <button type="button" className="profile-print-link" onClick={printFiche}>
                Imprimer la fiche
              </button>
            </div>
          </>
        )}

        <div className="fiche-print" ref={printRef}>
          <div className="fiche-print-head">
            <BrandLogo size={72} />
            <div>
              <strong>COORDINATION FLAMBEAUX-LUMIÈRES CMA</strong>
              <div>Côte d&apos;Ivoire — SAAP CFLCMA-CI</div>
              <h2>Fiche d&apos;inscription membre</h2>
            </div>
            <MemberAvatar
              photoUrl={profile.photoUrl}
              prenom={profile.prenom}
              nom={profile.nom}
              isSuperAdmin={profile.isSuperAdmin}
              className="fiche-print-photo"
              alt={`${profile.prenom} ${profile.nom}`}
            />
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
              <strong>{titreNom(profile.role, profile.titre)}</strong>
            </div>
            <div>
              <span>Grades</span>
              <strong>{gradeNom(profile.role)}</strong>
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
