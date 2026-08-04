import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

function statutBadge(statut) {
  const map = {
    VALIDE: 'badge-valide',
    EN_ATTENTE: 'badge-en_attente',
    REJETE: 'badge-attente',
    SUSPENDU: 'badge-attente',
  };
  return map[statut] || 'badge-attente';
}

export default function ProfilePage() {
  const { user, refreshMe } = useAuthStore();
  const [profile, setProfile] = useState(user);

  useEffect(() => {
    refreshMe().then(setProfile).catch(() => {});
  }, []);

  if (!profile) return null;

  return (
    <Layout>
      <section className="stack">
        <div>
          {profile.photoUrl && (
            <img
              src={profile.photoUrl}
              alt={`${profile.prenom} ${profile.nom}`}
              className="profile-photo"
            />
          )}
          <p className="muted" style={{ margin: 0 }}>Mon profil</p>
          <h1>
            {profile.prenom} {profile.nom}
          </h1>
          <span className={`badge ${statutBadge(profile.statut)}`}>
            {profile.statut.replace('_', ' ')}
          </span>
        </div>

        <div className="card">
          <div className="stack">
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>ID membre</div>
              <strong style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
                {profile.idMembre}
              </strong>
            </div>
            <div className="form-row" style={{ gap: '1rem' }}>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Branche</div>
                <div>
                  {profile.branche === 'LUMIERES'
                    ? 'Lumières (Femme)'
                    : profile.branche === 'FLAMBEAUX'
                      ? 'Flambeaux (Homme)'
                      : '—'}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Titre</div>
                <div>{profile.role?.nom || 'Membres actifs'}</div>
              </div>
            </div>
            <div className="form-row" style={{ gap: '1rem' }}>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Contact</div>
                <div>{profile.contact || '—'}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Situation matrimoniale</div>
                <div>{profile.situationMatrimoniale || '—'}</div>
              </div>
            </div>
            <div className="form-row" style={{ gap: '1rem' }}>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Profession</div>
                <div>{profile.profession || '—'}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Responsabilité dans le bureau</div>
                <div>{profile.responsabiliteBureau || '—'}</div>
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>Rattachement</div>
              <div>
                {[
                  profile.region?.nom,
                  profile.district?.nom,
                  profile.paroisse?.nom,
                  profile.communaute?.nom,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
