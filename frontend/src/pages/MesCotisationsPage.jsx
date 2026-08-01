import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function MesCotisationsPage() {
  const { user } = useAuthStore();
  const [cotisations, setCotisations] = useState([]);
  const [activites, setActivites] = useState([]);
  const [selected, setSelected] = useState('');
  const [provider, setProvider] = useState('ORANGE');
  const [phone, setPhone] = useState(user?.contact || '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const [c, a] = await Promise.all([
      api.get('/cotisations/me'),
      api.get('/activites'),
    ]);
    setCotisations(c.data.data || []);
    setActivites(a.data.data || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function payer(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/cotisations', {
        modePaiement: 'MOBILE_MONEY',
        activiteId: Number(selected),
        provider,
        phone,
      });
      setMsg(data.data?.message || 'Paiement initié');
      await load();
    } catch (error) {
      setErr(error.response?.data?.message || 'Échec du paiement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="stack">
        <div>
          <h1>Mes cotisations</h1>
          <p className="muted">Suivi et paiement mobile money</p>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        <form className="card" onSubmit={payer}>
          <h2>Payer une cotisation</h2>
          <div className="form-group">
            <label htmlFor="activite">Activité</label>
            <select
              id="activite"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              <option value="">Choisir…</option>
              {activites.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} ({a.prefixeIdPaiement}) — {Number(a.montantDefaut || 0)} FCFA
                </option>
              ))}
            </select>
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
          <button className="btn btn-block" disabled={loading}>
            {loading ? 'Initiation…' : 'Payer par Mobile Money'}
          </button>
        </form>

        <div className="stack">
          {cotisations.map((c) => (
            <div key={c.id} className="card">
              <strong>{c.activite?.nom}</strong>
              <div className="muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                {c.idPaiement}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {Number(c.montantPaye)} / {Number(c.montant)} FCFA
                </span>
                <span
                  className={`badge ${
                    c.statut === 'PAYE'
                      ? 'badge-paye'
                      : c.statut === 'PARTIEL'
                        ? 'badge-partiel'
                        : 'badge-attente'
                  }`}
                >
                  {c.statut}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
