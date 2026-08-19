import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../../components/AdminShell';
import MemberAvatar from '../../components/MemberAvatar';
import ProfilePhotoCapture from '../../components/ProfilePhotoCapture';
import BrandLogo from '../../components/BrandLogo';
import { titreNom, gradeNom } from '../../utils/roleDisplay';
import { paths } from '../../config/env';
import api from '../../api/client';
import '../ProfilePage.css';
import './AdminMembreProfil.css';

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
  return (
    [
      profile.region?.nom,
      profile.district?.nom,
      profile.paroisse?.nom,
      profile.communaute?.nom,
    ]
      .filter(Boolean)
      .join(' · ') || '—'
  );
}

export default function AdminMembreProfilPage() {
  const { membreId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/membres/${membreId}`)
      .then((res) => {
        if (!cancelled) setProfile(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Impossible de charger le profil');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [membreId]);

  function printFiche() {
    window.print();
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
      setPhotoFile(null);
      setShowPhotoEditor(false);
      setMsg(data.message || 'Photo mise à jour');
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Échec de l\'envoi de la photo');
    } finally {
      setPhotoSaving(false);
    }
  }

  const dateNaiss = profile?.dateNaissance
    ? new Date(profile.dateNaissance).toLocaleDateString('fr-FR')
    : '—';

  const isMemberAccount = profile && !profile.isSuperAdmin;

  return (
    <AdminShell
      title="Profil membre"
      crumbs={['Tableaux de bord', 'Membres', profile ? `${profile.prenom} ${profile.nom}` : 'Profil']}
    >
      <section className="admin-membre-profil">
        <button
          type="button"
          className="profil-back"
          onClick={() => navigate(paths.adminMembres)}
        >
          ← Retour aux membres
        </button>

        {loading && <p className="muted">Chargement du profil…</p>}
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success no-print">{msg}</div>}

        {profile && (
          <>
            <div className="card profil-view no-print">
              <div className="profil-view-head">
                <MemberAvatar
                  photoUrl={profile.photoUrl}
                  prenom={profile.prenom}
                  nom={profile.nom}
                  isSuperAdmin={profile.isSuperAdmin}
                  className="avatar-lg"
                  alt={`${profile.prenom} ${profile.nom}`}
                />
                <div className="profil-view-titles">
                  <p className="muted" style={{ margin: 0 }}>
                    Profil membre
                  </p>
                  <h1>
                    {profile.prenom} {profile.nom}
                  </h1>
                  <span className={`badge ${statutBadge(profile.statut)}`}>
                    {String(profile.statut || '').replace('_', ' ')}
                  </span>
                </div>
                <div className="profil-view-actions">
                  <Link
                    to={paths.adminMembres}
                    className="btn btn-secondary"
                    state={{ editMembreId: profile.id }}
                  >
                    Modifier
                  </Link>
                  <button type="button" className="btn" onClick={printFiche}>
                    Imprimer la fiche
                  </button>
                </div>
              </div>

              <div className="profil-view-grid">
                <div>
                  <div className="muted tiny">ID membre</div>
                  <strong className="id-big">{profile.idMembre}</strong>
                </div>
                <div>
                  <div className="muted tiny">Branche</div>
                  <div>{brancheLabel(profile.branche)}</div>
                </div>
                <div>
                  <div className="muted tiny">Titre</div>
                  <div>{titreNom(profile.role)}</div>
                </div>
                <div>
                  <div className="muted tiny">Grades</div>
                  <div>{gradeNom(profile.role)}</div>
                </div>
                <div>
                  <div className="muted tiny">Contact</div>
                  <div>{profile.contact || '—'}</div>
                </div>
                <div>
                  <div className="muted tiny">E-mail</div>
                  <div>{profile.email || '—'}</div>
                </div>
                <div>
                  <div className="muted tiny">Date de naissance</div>
                  <div>{dateNaiss}</div>
                </div>
                <div>
                  <div className="muted tiny">Lieu de naissance</div>
                  <div>{profile.lieuNaissance || '—'}</div>
                </div>
                <div>
                  <div className="muted tiny">Situation matrimoniale</div>
                  <div>{profile.situationMatrimoniale || '—'}</div>
                </div>
                <div>
                  <div className="muted tiny">Profession</div>
                  <div>{profile.profession || '—'}</div>
                </div>
                <div>
                  <div className="muted tiny">Responsabilité bureau</div>
                  <div>{profile.responsabiliteBureau || '—'}</div>
                </div>
                <div className="profil-view-span">
                  <div className="muted tiny">Rattachement</div>
                  <div>{rattachement(profile)}</div>
                </div>
              </div>
            </div>

            {isMemberAccount && (
              <div className="card no-print profil-photo-admin">
                {!showPhotoEditor ? (
                  <>
                    <h2 className="profile-edit-title">Photo de profil</h2>
                    <p className="muted profil-photo-admin__hint">
                      {profile.photoUrl
                        ? 'Remplacer la photo d\'identité de ce membre.'
                        : 'Ajouter une photo d\'identité pour ce membre.'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setPhotoError('');
                        setShowPhotoEditor(true);
                      }}
                    >
                      {profile.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
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
                    <div className="profil-view-actions" style={{ marginTop: '0.75rem' }}>
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

            <div className="fiche-print">
              <div className="fiche-print-head">
                <BrandLogo size={72} />
                <div>
                  <strong>COORDINATION FLAMBEAUX-LUMIÈRES CMA</strong>
                  <div>Côte d&apos;Ivoire — SAAP CFLCMA-CI</div>
                  <h2>Fiche membre</h2>
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
                  <strong>{titreNom(profile.role)}</strong>
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
                  <span>Contact</span>
                  <strong>{profile.contact || '—'}</strong>
                </div>
                <div>
                  <span>E-mail</span>
                  <strong>{profile.email || '—'}</strong>
                </div>
                <div>
                  <span>Rattachement</span>
                  <strong>{rattachement(profile)}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </AdminShell>
  );
}
