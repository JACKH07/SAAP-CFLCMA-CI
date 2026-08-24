import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { paths } from '../config/env';
import { formatDateHeure, moyenPaiement, totalVersements } from '../utils/paiement';
import './MesCotisationsPage.css';

export default function MesCotisationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cotisations, setCotisations] = useState([]);
  const [activites, setActivites] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

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

  useEffect(() => {
    const paiement = searchParams.get('paiement');
    const id = searchParams.get('id');
    if (!paiement) return;

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('paiement');
      next.delete('id');
      setSearchParams(next, { replace: true });
    };

    if (paiement === 'ok' && id) {
      setInfo('Vérification du paiement Orange Money…');
      api
        .post(`/cotisations/verify/${encodeURIComponent(id)}`)
        .then((res) => {
          const statut = res.data?.data?.statut;
          setInfo(
            statut === 'PAYE'
              ? 'Paiement confirmé.'
              : 'Paiement en cours de confirmation par Orange Money.'
          );
          return load();
        })
        .catch(() => {
          setInfo(
            'Paiement en cours de confirmation. Le statut sera mis à jour dès réception de la notification Orange.'
          );
        })
        .finally(clearParams);
      return;
    }

    if (paiement === 'annule') {
      setErr('Paiement annulé.');
    } else if (paiement === 'echec') {
      setErr('Paiement échoué.');
    }
    clearParams();
  }, [searchParams, setSearchParams]);

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
          <p className="muted">
            Vous pouvez payer plusieurs fois la même activité. Le total est la somme de tous vos
            versements.
          </p>
        </div>

        {err && <div className="alert alert-error">{err}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        <div className="stack cotisations-list">
          {activites.map((a) => {
            const c = findCotisation(a.id);
            const paye = totalVersements(c);
            const versements = c?.versements || [];
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
                    {versements.length > 0
                      ? `${versements.length} versement${versements.length > 1 ? 's' : ''} · ${paye.toLocaleString('fr-FR')} FCFA`
                      : `${paye.toLocaleString('fr-FR')} FCFA versés`}
                  </span>
                  {versements.length > 0 && (
                    <ul className="cotisation-versements">
                      {versements.map((v) => (
                        <li key={v.id}>
                          {formatDateHeure(v.datePaiement)} · {moyenPaiement(v)} ·{' '}
                          {Number(v.montant).toLocaleString('fr-FR')} F
                        </li>
                      ))}
                    </ul>
                  )}
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
