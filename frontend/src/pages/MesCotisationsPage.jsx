import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { paths } from '../config/env';
import './MesCotisationsPage.css';

export default function MesCotisationsPage() {
  const navigate = useNavigate();
  const [cotisations, setCotisations] = useState([]);
  const [activites, setActivites] = useState([]);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const [c, a] = await Promise.all([
        api.get('/cotisations/me'),
        api.get('/activites'),
      ]);
      setCotisations(c.data.data || []);
      setActivites(a.data.data || []);
    } catch {
      setErr('Impossible de charger les cotisations');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function goPayer(activiteId) {
    navigate(`${paths.mesCotisations}/payer/${activiteId}`);
  }

  function findCotisation(activiteId) {
    return cotisations.find(
      (c) => String(c.activiteId) === String(activiteId) || String(c.activite?.id) === String(activiteId)
    );
  }

  return (
    <Layout>
      <section className="stack">
        <div>
          <h1>Mes cotisations</h1>
          <p className="muted">Choisissez une activité pour saisir le montant à payer</p>
        </div>

        {err && <div className="alert alert-error">{err}</div>}

        <div className="stack cotisations-list">
          {activites.map((a) => {
            const c = findCotisation(a.id);
            const paye = Number(c?.montantPaye || 0);
            const statut = c?.statut || 'EN_ATTENTE';
            return (
              <button
                key={a.id}
                type="button"
                className="card cotisation-card-btn"
                onClick={() => goPayer(a.id)}
              >
                <div className="cotisation-card-main">
                  <strong>{a.nom}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                    {c?.idPaiement || a.prefixeIdPaiement}
                  </div>
                  <span className="cotisation-paye">
                    {paye.toLocaleString('fr-FR')} FCFA versés
                  </span>
                </div>
                <span
                  className={`badge ${
                    statut === 'PAYE'
                      ? 'badge-paye'
                      : statut === 'PARTIEL'
                        ? 'badge-partiel'
                        : 'badge-attente'
                  }`}
                >
                  {statut}
                </span>
              </button>
            );
          })}
          {!activites.length && <p className="muted">Aucune activité disponible</p>}
        </div>
      </section>
    </Layout>
  );
}
