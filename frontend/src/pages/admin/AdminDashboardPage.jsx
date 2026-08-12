import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../../components/AdminShell';
import MemberAvatar from '../../components/MemberAvatar';
import api from '../../api/client';
import { paths, adminMembreProfilPath } from '../../config/env';
import { titreNom, gradeNom } from '../../utils/roleDisplay';
import './AdminDashboard.css';
import './AdminMembreProfil.css';

const COLORS = {
  primary: '#1c7c38',
  primarySoft: '#a8dfb6',
  secondary: '#c9a227',
  secondarySoft: '#f0e2a8',
  warn: '#a48434',
  muted: '#94a3b8',
  ok: '#059669',
  danger: '#dc2626',
  ink: '#0f172a',
};

function initials(prenom, nom) {
  return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?';
}

function Sparkline({ points, color }) {
  if (!points?.length) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const w = 88;
  const h = 34;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="spark" aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('1A');

  async function load(rid = regionId, { soft = false } = {}) {
    setError('');
    if (soft && stats) setRefreshing(true);
    else setLoading(true);
    try {
      const params = rid ? { regionId: rid } : {};
      const { data } = await api.get('/dashboard/stats', { params });
      const payload = data.data;
      setStats(payload);
      if (payload?.regions?.length) {
        setRegions(payload.regions);
      } else if (!regions.length) {
        const r = await api.get('/regions');
        setRegions(r.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const geoChartBranded = useMemo(() => {
    if (regionId && stats?.parDistrict?.length) {
      return [...stats.parDistrict]
        .sort((a, b) => (b.membres || 0) - (a.membres || 0))
        .slice(0, 12)
        .map((d) => ({
          name: d.nom.length > 10 ? `${d.nom.slice(0, 9)}…` : d.nom,
          fullName: d.nom,
          flambeaux: d.flambeaux ?? 0,
          lumieres: d.lumieres ?? 0,
          payees: d.payees,
        }));
    }
    if (!stats?.parRegion) return [];
    return [...stats.parRegion]
      .sort((a, b) => b.membres - a.membres)
      .slice(0, 12)
      .map((r) => ({
        name: r.nom.length > 10 ? `${r.nom.slice(0, 9)}…` : r.nom,
        fullName: r.nom,
        flambeaux: r.flambeaux ?? 0,
        lumieres: r.lumieres ?? 0,
        payees: r.payees,
      }));
  }, [stats, regionId]);

  const branchePie = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Lumières', value: stats.membres.lumieres || 0, color: COLORS.secondary },
      { name: 'Flambeaux', value: stats.membres.flambeaux || 0, color: COLORS.primary },
    ].filter((x) => x.value > 0);
  }, [stats]);

  const sparkMembres = useMemo(() => {
    if (regionId && stats?.parDistrict?.length) {
      return stats.parDistrict.slice(0, 8).map((d) => d.membres || 0);
    }
    return (stats?.parRegion || []).slice(0, 8).map((r) => r.membres);
  }, [stats, regionId]);
  const sparkTaux = useMemo(() => {
    if (regionId && stats?.parDistrict?.length) {
      return stats.parDistrict.slice(0, 8).map((d) => d.taux || 0);
    }
    return (stats?.parRegion || []).slice(0, 8).map((r) => r.taux);
  }, [stats, regionId]);

  const selectedRegionName = useMemo(() => {
    if (!regionId) return null;
    return regions.find((r) => String(r.id) === String(regionId))?.nom || null;
  }, [regionId, regions]);

  const totalMembres =
    (stats?.membres.flambeaux ?? 0) + (stats?.membres.lumieres ?? 0) || stats?.membres.total || 0;

  const montantTotalPercu = Number(stats?.cotisations?.montantPercu || 0);
  const montantAttendu = Number(stats?.cotisations?.montantAttendu || 0);

  return (
    <AdminShell title="Tableaux de bord" crumbs={['Tableaux de bord']}>
      <div className="dash-toolbar">
        <select
          className="dash-select"
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);
            load(e.target.value, { soft: true });
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
            Excel
          </button>
          <button type="button" className="dash-btn primary" onClick={() => exportFile('pdf')}>
            PDF
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && !stats && (
        <div className="dash-skeleton" aria-busy="true" aria-label="Chargement du tableau de bord">
          <div className="kpi-row kpi-row--4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dash-card skeleton-card">
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-60 lg" />
                <div className="skeleton-line w-50" />
              </div>
            ))}
          </div>
          <div className="dash-row-2">
            <div className="dash-card skeleton-card skeleton-chart" />
            <div className="dash-card skeleton-card skeleton-chart" />
          </div>
          <div className="dash-card skeleton-card skeleton-table" />
        </div>
      )}

      {refreshing && stats && (
        <p className="dash-refresh-hint muted" aria-live="polite">
          Mise à jour…
        </p>
      )}

      {stats && (
        <div className={refreshing ? 'dash-content is-refreshing' : 'dash-content'}>
          <div className="kpi-row kpi-row--4">
            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Montant total</span>
                <Sparkline points={sparkTaux} color={COLORS.ok} />
              </div>
              <div className="kpi-value kpi-value--money">
                {montantTotalPercu.toLocaleString('fr-FR')}
                <small> FCFA</small>
              </div>
              <div className="kpi-foot ok">
                Cotisations perçues
                {montantAttendu > 0
                  ? ` · attendu ${montantAttendu.toLocaleString('fr-FR')} F`
                  : ''}
              </div>
            </div>

            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Membres du bureau</span>
                <Sparkline points={sparkTaux} color={COLORS.secondary} />
              </div>
              <div className="kpi-value">{(stats.membres.bureau ?? 0).toLocaleString('fr-FR')}</div>
              <div className="kpi-foot ok">Désignés au bureau</div>
            </div>

            <div className="dash-card kpi-card kpi-card--metric">
              <div className="kpi-metric-icon" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="9.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M20 19v-1a3.5 3.5 0 0 0-2.5-3.3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="17" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div className="kpi-metric-value">{totalMembres.toLocaleString('fr-FR')}</div>
              <div className="kpi-metric-label">Total membres</div>
            </div>

            <div className="dash-card kpi-card">
              <div className="kpi-head">
                <span>Cotisations payées</span>
                <Sparkline points={sparkMembres} color={COLORS.primary} />
              </div>
              <div className="kpi-value">
                {(stats.cotisations?.payees ?? 0).toLocaleString('fr-FR')}
              </div>
              <div className="kpi-foot">
                Taux {(stats.cotisations?.tauxPaiement ?? 0).toLocaleString('fr-FR')} %
              </div>
            </div>
          </div>

          <div className="dash-row-2">
            <div className="dash-card chart-card">
              <div className="card-head">
                <div>
                  <h2>{regionId ? 'Effectifs par district' : 'Effectifs par région'}</h2>
                  <p>
                    {regionId
                      ? `Flambeaux & Lumières — ${selectedRegionName || 'région'}`
                      : 'Flambeaux & Lumières (top 12)'}
                  </p>
                </div>
                <div className="range-tabs" role="group" aria-label="Période">
                  {['1J', '7J', '1M', '1A'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={range === r ? 'active' : ''}
                      onClick={() => setRange(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={geoChartBranded} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                    <Legend />
                    <Bar dataKey="flambeaux" name="Flambeaux" stackId="a" fill={COLORS.primary} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="lumieres" name="Lumières" stackId="a" fill={COLORS.secondary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dash-card summary-strip-card">
              <div className="card-head">
                <div>
                  <h2>Résumé des inscriptions</h2>
                  <p>Statuts des dossiers membres</p>
                </div>
              </div>
              <div className="summary-strip">
                <div className="summary-item">
                  <span className="summary-ico wait" />
                  <div>
                    <strong>{stats.membres.enAttente.toLocaleString('fr-FR')}</strong>
                    <em>Nouveaux / en attente</em>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-ico ok" />
                  <div>
                    <strong>{totalMembres.toLocaleString('fr-FR')}</strong>
                    <em>Membres validés</em>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-ico danger" />
                  <div>
                    <strong>{(stats.membres.rejetes || 0).toLocaleString('fr-FR')}</strong>
                    <em>Dossiers rejetés</em>
                  </div>
                </div>
              </div>
              <div className="amount-banner">
                <div>
                  <span>Membres suspendus</span>
                  <strong>{(stats.membres.suspendus || 0).toLocaleString('fr-FR')}</strong>
                </div>
                <small>Suivi des dossiers Flambeaux & Lumières</small>
              </div>
            </div>
          </div>

          <div className="dash-row-2 dash-row-2--swap">
            <div className="dash-card chart-card chart-card--membres">
              <div className="card-head">
                <div>
                  <h2>Membres</h2>
                </div>
              </div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={branchePie.length ? branchePie : [{ name: 'Aucune', value: 1, color: '#e2e8f0' }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {(branchePie.length ? branchePie : [{ color: '#e2e8f0' }]).map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => Number(value).toLocaleString('fr-FR')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="donut-legend donut-legend--membres">
                <li>
                  <span className="dot" style={{ background: COLORS.secondary }} />
                  <em>Lumières</em>
                  <strong>{(stats.membres.lumieres ?? 0).toLocaleString('fr-FR')}</strong>
                </li>
                <li>
                  <span className="dot" style={{ background: COLORS.primary }} />
                  <em>Flambeaux</em>
                  <strong>{(stats.membres.flambeaux ?? 0).toLocaleString('fr-FR')}</strong>
                </li>
              </ul>
            </div>
          </div>

          <div className="dash-card table-card">
            <div className="card-head">
              <div>
                <h2>Liste des membres</h2>
                <p>Titre, grades, région, district, paroisse et communauté</p>
              </div>
              <Link to={paths.adminMembres} className="dash-btn ghost">
                Voir tout
              </Link>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Titre</th>
                    <th>Grades</th>
                    <th>Région</th>
                    <th>District</th>
                    <th>Paroisse</th>
                    <th>Communauté</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.derniersMembres || []).map((m) => (
                    <tr
                      key={m.id}
                      className="membre-row-link"
                      onClick={() => navigate(adminMembreProfilPath(m.id))}
                    >
                      <td>
                        <div className="person-cell">
                          <MemberAvatar
                            photoUrl={m.photoUrl}
                            prenom={m.prenom}
                            nom={m.nom}
                            isAdmin={m.isAdmin}
                            isSuperAdmin={m.isSuperAdmin}
                          />
                          <div>
                            <strong>
                              {m.prenom} {m.nom}
                            </strong>
                            <em>{m.idMembre}</em>
                          </div>
                        </div>
                      </td>
                      <td>{titreNom(m.role)}</td>
                      <td>{gradeNom(m.role)}</td>
                      <td>{m.region?.nom || '—'}</td>
                      <td>{m.district?.nom || '—'}</td>
                      <td>{m.paroisse?.nom || '—'}</td>
                      <td>{m.communaute?.nom || '—'}</td>
                    </tr>
                  ))}
                  {!stats.derniersMembres?.length && (
                    <tr>
                      <td colSpan={7} className="muted">
                        Aucun membre
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              <span>
                Affichage de {(stats.derniersMembres || []).length} membre(s)
              </span>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
