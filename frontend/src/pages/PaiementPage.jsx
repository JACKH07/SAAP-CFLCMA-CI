import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { paths } from '../config/env';
import './PaiementPage.css';

export default function PaiementPage() {
  const { activiteId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const activiteId = paramId || searchParams.get('activiteId');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activite, setActivite] = useState(null);
  const [cotisation, setCotisation] = useState(null);
  const [montant, setMontant] = useState('');
  const [provider, setProvider] = useState('ORANGE');
  const [phone, setPhone] = useState(user?.contact || '');
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!activiteId) {
      setErr('Activité non précisée');
      setLoadingMeta(false);
      return;
    }
    setLoadingMeta(true);
    Promise.all([api.get('/activites'), api.get('/cotisations/me')])
      .then(([aRes, cRes]) => {
        const list = aRes.data.data || [];
        const found = list.find((a) => String(a.id) === String(activiteId));
        setActivite(found || null);
        if (!found) setErr('Activité introuvable');
        const mine = (cRes.data.data || []).find(
          (c) => String(c.activiteId) === String(activiteId) || String(c.activite?.id) === String(activiteId)
        );
        setCotisation(mine || null);
      })
      .catch(() => setErr('Impossible de charger l\'activité'))
      .finally(() => setLoadingMeta(false));
  }, [activiteId]);

  const dejaPaye = useMemo(() => Number(cotisation?.montantPaye || 0), [cotisation]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    const value = Number(montant);
    if (!Number.isFinite(value) || value <= 0) {
      setErr('Saisissez un montant valide en FCFA');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/cotisations', {
        modePaiement: 'MOBILE_MONEY',
        activiteId: Number(activiteId),
        provider,
        phone,
        montant: value,
      });
      setMsg(data.data?.message || 'Paiement enregistré');
      setMontant('');
      if (data.data?.cotisation) setCotisation(data.data.cotisation);
      else {
        const cRes = await api.get('/cotisations/me');
        const mine = (cRes.data.data || []).find(
          (c) => String(c.activiteId) === String(activiteId) || String(c.activite?.id) === String(activiteId)
        );
        setCotisation(mine || null);
      }
    } catch (error) {
      setErr(error.response?.data?.message || 'Échec du paiement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="stack paiement-page">
        <button type="button" className="paiement-back" onClick={() => navigate(paths.mesCotisations)}>
          ← Mes cotisations
        </button>

        <div>
          <h1>Paiement</h1>
          <p className="muted">Saisissez le montant à verser — aucun montant fixe</p>
        </div>

        {loadingMeta && <p className="muted">Chargement…</p>}
        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        {activite && (
          <>
            <div className="card paiement-activite">
              <strong>{activite.nom}</strong>
              <div className="muted tiny">{activite.prefixeIdPaiement}</div>
              <div className="paiement-deja">
                Déjà versé : <strong>{dejaPaye.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>

            <form className="card" onSubmit={onSubmit}>
              <div className="form-group">
                <label htmlFor="montant">Montant (FCFA)</label>
                <input
                  id="montant"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="Ex. 2000"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="provider">Opérateur</label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="ORANGE">Orange Money</option>
                    <option value="MTN">MTN MoMo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Numéro</label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="btn btn-block" type="submit" disabled={loading}>
                {loading ? 'Paiement…' : 'Payer par Mobile Money'}
              </button>
            </form>
          </>
        )}

        {!loadingMeta && !activite && (
          <p className="muted">
            <Link to={paths.mesCotisations}>Retour aux cotisations</Link>
          </p>
        )}
      </section>
    </Layout>
  );
}
