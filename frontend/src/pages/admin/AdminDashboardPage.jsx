import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import './AdminDashboard.css';

const COLORS = {
  primary: '#1c7c38',
  secondary: '#c9a227',
  warn: '#a48434',
  muted: '#94a3a0',
  ok: '#1c7c38',
  soft: '#a8dfb6',
};

function formatFcfa(n) {
  return Math.round(Number(n) || 0).toLocaleString('fr-FR');
}

function RingStat({ label, value, percent, color }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;

  return (
    <div className="ring-card dash-card">
      <div className="ring-wrap">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#eef2f7" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 44 44)"
          />
          <text x="44" y="48" textAnchor="middle" className="ring-pct">
            {percent}%
          </text>
        </svg>
      </div>
      <div>
        <div className="ring-value">{value}</div>
        <div className="ring-label">{label}</div>
      </div>
    </div>
  );
}

function Sparkline({ points, color }) {
  if (!points?.length) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const w = 90;
  const h = 36;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="spark">
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(rid = regionId) {
    setError('');
    setLoading(true);
    try {
      const params = rid ? { regionId: rid } : {};
      const { data } = await api.get('/dashboard/stats', { params });
      setStats(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/regions').then((r) => setRegions(r.data.data || []));
    load();
  }, []);

  function exportFile(type) {
    api
      .get(`/dashboard/export/${type}`, {
        params: regionId ? { regionId } : {},
        responseType: 'blob',
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'excel' ? 'rapport-cflcma-ci.xlsx' : 'rapport-cflcma-ci.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError('Export impossible'));
  }

  const regionChart = useMemo(() => {
    if (!stats?.parRegion) return [];
    return [...stats.parRegion]
      .sort((a, b) => b.membres - a.membres)
      .slice(0, 12)
      .map((r) => ({
        name: r.nom.length > 10 ? `${r.nom.slice(0, 9)}…` : r.nom,
        fullName: r.nom,
        membres: r.membres,
        payees: r.payees,
        taux: r.taux,
      }));
  }, [stats]);

  const statutPie = useMemo(() => {
    if (!stats) return [];
    const c = stats.cotisations;
    return [
      { name: 'Payées', value: c.payees, color: COLORS.ok },
      { name: 'Partielles', value: c.partielles, color: COLORS.warn },
      { name: 'En attente', value: c.enAttente, color: COLORS.muted },
    ].filter((x) => x.value > 0);
  }, [stats]);

  const activiteBars = useMemo(() => {
    if (!stats?.parActivite) return [];
    return stats.parActivite.map((a) => ({
      name: a.prefixe,
      fullName: a.nom,
      total: a.total,
      payees: a.payees,
      taux: a.taux,
      percu: a.montantPercu,
    }));
  }, [stats]);

  const topRegionsTable = useMemo(() => {
    if (!stats?.parRegion) return [];
    return [...stats.parRegion].sort((a, b) => b.taux - a.taux || b.membres - a.membres).slice(0, 8);
  }, [stats]);

  const sparkMembres = useMemo(
    () => (stats?.parRegion || []).slice(0, 8).map((r) => r.membres),
    [stats]
  );
  const sparkTaux = useMemo(
    () => (stats?.parRegion || []).slice(0, 8).map((r) => r.taux),
    [stats]
  );

  const totalCotisations = stats?.cotisations?.total || 0;
  const tauxPercu = stats
    ? stats.cotisations.montantAttendu > 0
      ? Math.round((stats.cotisations.montantPercu / stats.cotisations.montantAttendu) * 100)
      : 0
    : 0;

  return (
    <AdminShell title="Analytique" crumbs={['Tableaux de bord', 'Analytique']}>
      <div className="dash-toolbar">
        <select
          className="dash-select"
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);
            load(e.target.value);
          }}
        >
          <option value="">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
        <div className="dash-actions">
          <button type="button" className="dash-btn ghost" onClick={() => exportFile('excel')}>
            Exporter Excel
          </button>
          <button type="button" className="dash-btn primary" onClick={() => exportFile('pdf')}>
            Exporter PDF
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && !stats && <p className="muted">Chargement des indicateurs…</p>}

      {stats && (
        <>
          <div className="kpi-row">
            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Flambeaux (Hommes)</span>
                <Sparkline points={sparkMembres} color={COLORS.primary} />
              </div>
              <div className="kpi-value">
                {(stats.membres.flambeaux ?? 0).toLocaleString('fr-FR')}
              </div>
              <div className="kpi-foot ok">Membres validés</div>
            </div>

            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Lumières (Femmes)</span>
                <Sparkline points={sparkTaux} color={COLORS.secondary} />
              </div>
              <div className="kpi-value">
                {(stats.membres.lumieres ?? 0).toLocaleString('fr-FR')}
              </div>
              <div className="kpi-foot ok">Membres validés</div>
            </div>

            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Total Flambeaux &amp; Lumières</span>
                <Sparkline points={sparkMembres} color={COLORS.primary} />
              </div>
              <div className="kpi-value">
                {(
                  (stats.membres.flambeaux ?? 0) + (stats.membres.lumieres ?? 0)
                  || stats.membres.total
                  || 0
                ).toLocaleString('fr-FR')}
              </div>
              <div className="kpi-foot">
                {(stats.membres.flambeaux ?? 0)} H · {(stats.membres.lumieres ?? 0)} F
                {stats.membres.enAttente > 0
                  ? ` · ${stats.membres.enAttente} en attente`
                  : ''}
              </div>
            </div>

            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Taux de paiement</span>
                <Sparkline points={sparkTaux} color={COLORS.warn} />
              </div>
              <div className="kpi-value">{stats.cotisations.tauxPaiement}%</div>
              <div className="kpi-foot">
                {stats.cotisations.payees}/{totalCotisations} cotisations soldées
              </div>
            </div>

            <div className="dash-card kpi-promo">
              <div className="promo-badge">FCFA</div>
              <p>Montant perçu</p>
              <strong>{formatFcfa(stats.cotisations.montantPercu)}</strong>
              <small>
                sur {formatFcfa(stats.cotisations.montantAttendu)} attendus ({tauxPercu}%)
              </small>
            </div>
          </div>

          <div className="dash-grid-mid">
            <div className="dash-card chart-card wide">
              <div className="card-head">
                <div>
                  <h2>Rapport par région</h2>
                  <p>Membres et cotisations payées (top 12)</p>
                </div>
                <button type="button" className="dash-btn ghost" onClick={() => exportFile('excel')}>
                  Exporter
                </button>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={regionChart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value, name) => [value, name === 'membres' ? 'Membres' : 'Payées']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                    <Legend />
                    <Bar dataKey="membres" name="Membres" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="payees" name="Cotisations payées" fill={COLORS.secondary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ring-stack">
              <RingStat
                label="Cotisations payées"
                value={stats.cotisations.payees.toLocaleString('fr-FR')}
                percent={totalCotisations ? Math.round((stats.cotisations.payees / totalCotisations) * 100) : 0}
                color={COLORS.primary}
              />
              <RingStat
                label="Montant encaissé"
                value={`${tauxPercu}%`}
                percent={tauxPercu}
                color={COLORS.warn}
              />
            </div>

            <div className="dash-card chart-card">
              <div className="card-head">
                <div>
                  <h2>Statut des cotisations</h2>
                  <p>Répartition nationale</p>
                </div>
              </div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statutPie.length ? statutPie : [{ name: 'Aucune', value: 1, color: '#e2e8f0' }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {(statutPie.length ? statutPie : [{ color: '#e2e8f0' }]).map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{totalCotisations}</strong>
                  <span>Total</span>
                </div>
              </div>
              <ul className="donut-legend">
                {(statutPie.length ? statutPie : [{ name: 'Aucune donnée', value: 0, color: '#94a3b8' }]).map((s) => (
                  <li key={s.name}>
                    <span className="dot" style={{ background: s.color }} />
                    <span>{s.name}</span>
                    <strong>
                      {s.value}
                      {totalCotisations ? ` · ${Math.round((s.value / totalCotisations) * 1000) / 10}%` : ''}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="dash-grid-bottom">
            <div className="dash-card chart-card">
              <div className="card-head">
                <div>
                  <h2>Activités — paiement</h2>
                  <p>Payées vs total par activité</p>
                </div>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={activiteBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="payees" name="Payées" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.secondary} strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dash-card chart-card">
              <div className="card-head">
                <div>
                  <h2>Top régions</h2>
                  <p>Taux de paiement</p>
                </div>
              </div>
              <div className="traffic-table">
                <div className="traffic-head">
                  <span>Région</span>
                  <span>Membres</span>
                  <span>Taux</span>
                </div>
                {topRegionsTable.map((r) => (
                  <div key={r.regionId} className="traffic-row">
                    <span className="traffic-name">{r.nom}</span>
                    <span>{r.membres}</span>
                    <div className="traffic-bar-wrap">
                      <div className="traffic-bar" style={{ width: `${Math.max(r.taux, 2)}%` }} />
                      <em>{r.taux}%</em>
                    </div>
                  </div>
                ))}
                {!topRegionsTable.length && <p className="muted">Aucune donnée régionale</p>}
              </div>
            </div>

            <div className="dash-card chart-card">
              <div className="card-head">
                <div>
                  <h2>Encaissements par activité</h2>
                  <p>Montants perçus (FCFA)</p>
                </div>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activiteBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(v) => [`${formatFcfa(v)} FCFA`, 'Perçu']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                    <Bar dataKey="percu" name="Perçu" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
