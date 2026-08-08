import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import './AdminCotisations.css';

function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('fr-FR')} F`;
}

export default function AdminCotisationsPage() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [activites, setActivites] = useState([]);
  const [membres, setMembres] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    membreId: '',
    activiteId: '',
    montantPaye: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  async function loadList() {
    const { data } = await api.get('/cotisations', {
      params: { search: search || undefined, limit: 40 },
    });
    setItems(data.items || []);
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger les indicateurs');
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/activites', { params: { all: true } }),
      api.get('/membres', { params: { limit: 100, statut: 'VALIDE' } }),
      loadList(),
      loadStats(),
    ])
      .then(([a, m]) => {
        setActivites(a.data.data || []);
        setMembres(m.data.items || []);
      })
      .catch((e) => setError(e.response?.data?.message || 'Erreur de chargement'));

    function onFocus() {
      loadList().catch(() => {});
      loadStats().catch(() => {});
    }
    window.addEventListener('focus', onFocus);
    const timer = setInterval(onFocus, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, []);

  const montantTotal = stats?.cotisations?.montantPercu ?? 0;
  const montantAttendu = stats?.cotisations?.montantAttendu ?? 0;
  const resteACollecter = Math.max(0, montantAttendu - montantTotal);
  const payees = stats?.cotisations?.payees ?? 0;
  const taux = stats?.cotisations?.tauxPaiement ?? 0;

  const regionChart = useMemo(() => {
    return [...(stats?.parRegion || [])]
      .filter((r) => (r.membres || 0) > 0 || (r.payees || 0) > 0 || Number(r.montantPercu || 0) > 0)
      .sort((a, b) => Number(b.montantPercu || 0) - Number(a.montantPercu || 0))
      .slice(0, 8)
      .map((r) => ({
        name: (r.nom || '').slice(0, 10),
        fullName: r.nom,
        percu: Number(r.montantPercu || 0),
        taux: Number(r.taux || 0),
      }));
  }, [stats]);

  const activiteChart = useMemo(() => {
    return (stats?.parActivite || []).map((a) => ({
      name: (a.nom || a.prefixe || 'Act.').slice(0, 12),
      fullName: a.nom,
      percu: Number(a.montantPercu || 0),
      attendu: Number(a.montantAttendu || 0),
    }));
  }, [stats]);

  const montantParActivite = useMemo(() => {
    const list = stats?.parActivite || [];
    if (!list.length) return 0;
    const sum = list.reduce((s, a) => s + Number(a.montantPercu || 0), 0);
    return Math.round(sum / list.length);
  }, [stats]);

  async function searchPayment(e) {
    e.preventDefault();
    setError('');
    if (!search.trim()) return loadList();
    try {
      if (search.includes('-')) {
        const { data } = await api.get(`/cotisations/search/${encodeURIComponent(search.trim())}`);
        setItems([data.data]);
      } else {
        await loadList();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Paiement introuvable');
    }
  }

  async function submitManual(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setError('');
    try {
      const body = new FormData();
      body.append('modePaiement', 'MANUEL');
      body.append('membreId', form.membreId);
      body.append('activiteId', form.activiteId);
      body.append('montantPaye', form.montantPaye);
      if (form.notes) body.append('notes', form.notes);
      if (file) body.append('justificatif', file);

      await api.post('/cotisations', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg('Paiement enregistré');
      setForm({ membreId: '', activiteId: '', montantPaye: '', notes: '' });
      setFile(null);
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la saisie');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Cotisations" crumbs={['Administration', 'Cotisations']}>
      <section className="cotis-dash">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loadingStats && !stats && <p className="muted">Chargement des indicateurs…</p>}

        <div className="cotis-kpi-row">
          <article className="cotis-kpi cotis-kpi--blue">
            <div className="cotis-kpi-text">
              <span>Montant Total</span>
              <strong>{formatMoney(montantTotal)}</strong>
            </div>
            <div className="cotis-kpi-ico" aria-hidden>
              <svg viewBox="0 0 48 48" width="52" height="52">
                <circle cx="24" cy="24" r="18" fill="rgba(255,255,255,0.22)" />
                <path
                  d="M24 12a12 12 0 1 1 0 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </article>

          <article className="cotis-kpi cotis-kpi--green">
            <div className="cotis-kpi-text">
              <span>Montant par Activité</span>
              <strong>{formatMoney(montantParActivite)}</strong>
            </div>
            <div className="cotis-kpi-ico" aria-hidden>
              <svg viewBox="0 0 48 48" width="52" height="52">
                <rect x="8" y="22" width="6" height="14" rx="1" fill="#fff" opacity="0.9" />
                <rect x="18" y="14" width="6" height="22" rx="1" fill="#fff" />
                <rect x="28" y="18" width="6" height="18" rx="1" fill="#fff" opacity="0.85" />
                <rect x="38" y="10" width="6" height="26" rx="1" fill="#fff" opacity="0.7" />
              </svg>
            </div>
          </article>

          <article className="cotis-kpi cotis-kpi--purple">
            <div className="cotis-kpi-text">
              <span>Cotisations payées</span>
              <strong>
                {payees.toLocaleString('fr-FR')}
                <small> · {taux} %</small>
              </strong>
            </div>
            <div className="cotis-kpi-ico" aria-hidden>
              <svg viewBox="0 0 48 48" width="52" height="52">
                <rect x="6" y="28" width="5" height="10" fill="#fff" opacity="0.7" />
                <rect x="14" y="20" width="5" height="18" fill="#fff" opacity="0.85" />
                <rect x="22" y="12" width="5" height="26" fill="#fff" />
                <rect x="30" y="16" width="5" height="22" fill="#fff" opacity="0.9" />
                <rect x="38" y="24" width="5" height="14" fill="#fff" opacity="0.75" />
              </svg>
            </div>
          </article>

          <article className="cotis-kpi cotis-kpi--red">
            <div className="cotis-kpi-text">
              <span>Dépenses</span>
              <strong>{formatMoney(resteACollecter)}</strong>
            </div>
            <div className="cotis-kpi-ico" aria-hidden>
              <svg viewBox="0 0 64 32" width="64" height="32">
                <polyline
                  points="2,26 12,18 22,22 32,8 42,14 52,6 62,12"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </article>
        </div>

        <div className="cotis-charts-row">
          <div className="cotis-panel">
            <h2>Cotisations perçues par région</h2>
            <div className="cotis-chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={regionChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => formatMoney(v)}
                    labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="percu" name="Perçu" fill="#4f7cff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="cotis-panel">
            <h2>Montants par activité</h2>
            <div className="cotis-chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={activiteChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cotisArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f7cff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4f7cff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => formatMoney(v)}
                    labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="percu"
                    name="Perçu"
                    stroke="#4f7cff"
                    strokeWidth={2.5}
                    fill="url(#cotisArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="cotis-bottom-row">
          <div className="cotis-panel">
            <h2>Saisie manuelle</h2>
            <form className="cotis-form" onSubmit={submitManual}>
              <div className="form-group">
                <label htmlFor="membreId">Membre</label>
                <select
                  id="membreId"
                  value={form.membreId}
                  onChange={(e) => setForm((f) => ({ ...f, membreId: e.target.value }))}
                  required
                >
                  <option value="">Choisir…</option>
                  {membres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.prenom} {m.nom} ({m.idMembre})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="activiteId">Activité</label>
                <select
                  id="activiteId"
                  value={form.activiteId}
                  onChange={(e) => setForm((f) => ({ ...f, activiteId: e.target.value }))}
                  required
                >
                  <option value="">Choisir…</option>
                  {activites.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="montantPaye">Montant reçu (FCFA)</label>
                <input
                  id="montantPaye"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.montantPaye}
                  onChange={(e) => setForm((f) => ({ ...f, montantPaye: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="justificatif">Justificatif (photo/PDF)</label>
                <input
                  id="justificatif"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Enregistrement…' : 'Enregistrer le paiement'}
              </button>
            </form>
          </div>

          <div className="cotis-panel">
            <div className="cotis-panel-head">
              <h2>Dernières cotisations</h2>
              <div className="cotis-panel-tools">
                <form className="cotis-search" onSubmit={searchPayment}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ID paiement…"
                    aria-label="Rechercher un ID paiement"
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">
                    OK
                  </button>
                </form>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    loadList().catch(() => {});
                    loadStats().catch(() => {});
                  }}
                >
                  Actualiser
                </button>
              </div>
            </div>
            <ul className="cotis-list">
              {items.length === 0 && <li className="muted">Aucune cotisation</li>}
              {items.slice(0, 20).map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{c.idPaiement}</strong>
                    <em>
                      {c.membre?.prenom} {c.membre?.nom} · {c.activite?.nom}
                    </em>
                  </div>
                  <div className="cotis-list-meta">
                    <span>
                      {Number(c.montantPaye).toLocaleString('fr-FR')} F versés
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
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
