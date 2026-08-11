import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../../components/AdminShell';
import MemberAvatar from '../../components/MemberAvatar';
import BrandLogo from '../../components/BrandLogo';
import { mediaUrl } from '../../utils/mediaUrl';
import { hasAdminAccess } from '../../utils/roles';
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

  const dateNaiss = profile?.dateNaissance
    ? new Date(profile.dateNaissance).toLocaleDateString('fr-FR')
    : '—';

  const showMemberPhoto =
    Boolean(profile?.photoUrl) && profile && !hasAdminAccess(profile);

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

        {profile && (
          <>
            <div className="card profil-view no-print">
              <div className="profil-view-head">
                {showMemberPhoto ? (
                  <img
                    src={mediaUrl(profile.photoUrl)}
                    alt=""
                    className="profile-photo"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <MemberAvatar
                    photoUrl={profile.photoUrl}
                    prenom={profile.prenom}
                    nom={profile.nom}
                    isAdmin={profile.isAdmin}
                    isSuperAdmin={profile.isSuperAdmin}
                    className="avatar-lg"
                  />
                )}
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
                  <div>{profile.role?.nom || 'Membres actifs'}</div>
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

            <div className="fiche-print">
              <div className="fiche-print-head">
                <BrandLogo size={72} />
                <div>
                  <strong>COORDINATION FLAMBEAUX-LUMIÈRES CMA</strong>
                  <div>Côte d&apos;Ivoire — SAAP CFLCMA-CI</div>
                  <h2>Fiche membre</h2>
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
