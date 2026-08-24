import { useEffect, useMemo, useState } from 'react';
import {
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
import { formatDateHeure, moyenPaiement, totalVersements, montantCible, restantDu } from '../../utils/paiement';
import { ACTIVITE_VISIBILITE, ACTIVITE_VISIBILITE_OPTIONS, isActiviteRegionale } from '../../utils/activiteVisibilite';
import './AdminCotisations.css';

function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('fr-FR')} F`;
}

const MONTANT_PAIEMENT_ANNUEL = 150000;

function isPaiementAnnuel(activite) {
  if (!activite) return false;
  if (isActiviteRegionale(activite)) return true;
  const prefixe = String(activite.prefixeIdPaiement || activite.prefixe || '').toUpperCase();
  if (prefixe === 'ANNUEL') return true;
  return /annuel/i.test(activite.nom || '');
}

const EMPTY_ACTIVITE = {
  nom: '',
  prefixeIdPaiement: '',
  montantDefaut: '',
  visibilite: ACTIVITE_VISIBILITE.TOUS,
  active: true,
};

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
  const [activiteForm, setActiviteForm] = useState(EMPTY_ACTIVITE);
  const [showActiviteForm, setShowActiviteForm] = useState(false);
  const [savingActivite, setSavingActivite] = useState(false);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedMembreId, setExpandedMembreId] = useState(null);
  const [regions, setRegions] = useState([]);
  const [detailActivite, setDetailActivite] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedRegionId, setExpandedRegionId] = useState(null);
  const [statsAnnuel, setStatsAnnuel] = useState(null);

  async function loadList() {
    const { data } = await api.get('/cotisations', {
      params: { search: search || undefined, limit: 200 },
    });
    setItems(data.items || []);
  }

  async function loadActivites() {
    const { data } = await api.get('/activites', { params: { all: true } });
    setActivites(data.data || []);
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
      api.get('/regions'),
      loadList(),
      loadStats(),
    ])
      .then(([a, m, r]) => {
        setActivites(a.data.data || []);
        setMembres(m.data.items || []);
        setRegions(r.data.data || []);
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

  async function loadStatsAnnuel(activiteId) {
    if (!activiteId) return;
    try {
      const { data } = await api.get('/dashboard/stats', { params: { activiteId } });
      setStatsAnnuel(data.data);
    } catch {
      setStatsAnnuel(null);
    }
  }

  const activiteAnnuel = useMemo(
    () => (activites || []).find(isPaiementAnnuel) || null,
    [activites]
  );

  useEffect(() => {
    if (!activiteAnnuel?.id) return undefined;
    loadStatsAnnuel(activiteAnnuel.id);
    const timer = setInterval(() => loadStatsAnnuel(activiteAnnuel.id), 30000);
    function onFocus() {
      loadStatsAnnuel(activiteAnnuel.id);
    }
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [activiteAnnuel?.id]);
  const montantParRegion = montantCible(activiteAnnuel) || MONTANT_PAIEMENT_ANNUEL;
  const nbRegions = (regions || []).length;
  const montantAnnuel = montantParRegion * nbRegions;
  const montantTotal = Number(stats?.cotisations?.montantPercu || 0);
  const montantVerseParToutesLesRegions = useMemo(() => {
    const parRegion = statsAnnuel?.parRegion || [];
    if (parRegion.length) {
      return parRegion.reduce((sum, region) => sum + Number(region.montantPercu || 0), 0);
    }
    return Number(statsAnnuel?.cotisations?.montantPercu || 0);
  }, [statsAnnuel]);
  const resteACollecter = Math.max(0, montantAnnuel - montantVerseParToutesLesRegions);
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

  const totauxParActivite = useMemo(() => {
    const fromStats = stats?.parActivite || [];
    const byId = new Map((activites || []).map((a) => [a.id, a]));
    if (fromStats.length) {
      return [...fromStats]
        .map((a) => {
          const meta = byId.get(a.activiteId) || {};
          return {
            id: a.activiteId,
            nom: a.nom || a.prefixe || meta.nom || 'Activité',
            percu: Number(a.montantPercu || 0),
            versements: Number(a.nbVersements || 0),
            visibilite: meta.visibilite,
            montantDefaut: meta.montantDefaut,
            prefixeIdPaiement: meta.prefixeIdPaiement || a.prefixe,
          };
        })
        .sort((a, b) => b.percu - a.percu);
    }
    return (activites || []).map((a) => ({
      id: a.id,
      nom: a.nom,
      percu: 0,
      versements: 0,
      visibilite: a.visibilite,
      montantDefaut: a.montantDefaut,
      prefixeIdPaiement: a.prefixeIdPaiement,
    }));
  }, [stats, activites]);

  const membresAyantPaye = useMemo(() => {
    const byMembre = new Map();
    for (const cotisation of items) {
      const total = totalVersements(cotisation);
      if (total <= 0) continue;
      const membreId = cotisation.membre?.id || cotisation.membreId;
      if (!membreId) continue;
      const current = byMembre.get(membreId) || {
        id: membreId,
        nom: cotisation.membre?.nom || '',
        prenom: cotisation.membre?.prenom || '',
        idMembre: cotisation.membre?.idMembre || '',
        contact: cotisation.membre?.contact || '',
        cotisations: [],
        total: 0,
        nbVersements: 0,
      };
      const versements = cotisation.versements || [];
      current.cotisations.push({
        id: cotisation.id,
        activite: cotisation.activite?.nom || 'Activité',
        idPaiement: cotisation.idPaiement,
        total,
        versements,
        statut: cotisation.statut,
      });
      current.total += total;
      current.nbVersements += versements.length || 1;
      byMembre.set(membreId, current);
    }
    return [...byMembre.values()].sort((a, b) => b.total - a.total);
  }, [items]);

  const detailParRegion = useMemo(() => {
    if (!detailActivite || !isActiviteRegionale(detailActivite)) return [];
    const cible = montantCible(detailActivite);
    const byRegion = new Map(
      (regions || []).map((region) => [
        region.id,
        {
          id: region.id,
          nom: region.nom,
          cotisations: [],
          total: 0,
          nbVersements: 0,
        },
      ])
    );
    const sansRegion = {
      id: 0,
      nom: 'Région non renseignée',
      cotisations: [],
      total: 0,
      nbVersements: 0,
    };

    for (const cotisation of detailItems) {
      const total = totalVersements(cotisation);
      const regionId = cotisation.region?.id || cotisation.regionId;
      const bucket = byRegion.get(regionId) || sansRegion;
      bucket.cotisations.push({ ...cotisation, total });
      bucket.total += total;
      bucket.nbVersements += (cotisation.versements || []).length;
    }

    const list = [...byRegion.values()];
    if (sansRegion.cotisations.length) list.push(sansRegion);
    return list
      .map((region) => ({
        ...region,
        cible,
        restant: cible != null ? restantDu(detailActivite, region.total) : null,
      }))
      .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr'));
  }, [detailActivite, detailItems, regions]);

  const detailParMembre = useMemo(() => {
    if (!detailActivite || isActiviteRegionale(detailActivite)) return [];
    const byMembre = new Map();
    for (const cotisation of detailItems) {
      const total = totalVersements(cotisation);
      if (total <= 0) continue;
      const membreId = cotisation.membre?.id || cotisation.membreId;
      if (!membreId) continue;
      const current = byMembre.get(membreId) || {
        id: membreId,
        nom: cotisation.membre?.nom || '',
        prenom: cotisation.membre?.prenom || '',
        idMembre: cotisation.membre?.idMembre || '',
        contact: cotisation.membre?.contact || '',
        cotisations: [],
        total: 0,
        nbVersements: 0,
      };
      current.cotisations.push({
        id: cotisation.id,
        activite: cotisation.activite?.nom || detailActivite.nom,
        idPaiement: cotisation.idPaiement,
        total,
        versements: cotisation.versements || [],
      });
      current.total += total;
      current.nbVersements += (cotisation.versements || []).length || 1;
      byMembre.set(membreId, current);
    }
    return [...byMembre.values()].sort((a, b) => b.total - a.total);
  }, [detailActivite, detailItems]);

  const activiteManuelle = activites.find((a) => String(a.id) === String(form.activiteId));
  const montantFixeManuel =
    Number(activiteManuelle?.montantDefaut) > 0 ? Number(activiteManuelle.montantDefaut) : null;

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

  async function removePayment(c) {
    const label = c.idPaiement || `#${c.id}`;
    const membre = `${c.membre?.prenom || ''} ${c.membre?.nom || ''}`.trim();
    if (
      !window.confirm(
        `Supprimer le paiement ${label}${membre ? ` (${membre})` : ''} ?\nCette action est définitive.`
      )
    ) {
      return;
    }
    setError('');
    setMsg('');
    setDeletingId(c.id);
    try {
      await api.delete(`/cotisations/${c.id}`);
      setMsg(`Paiement ${label} supprimé`);
      await Promise.all([loadList(), loadStats()]);
      if (detailActivite?.id) await loadActiviteDetail(detailActivite);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de supprimer le paiement');
    } finally {
      setDeletingId(null);
    }
  }

  function resetActiviteForm() {
    setActiviteForm(EMPTY_ACTIVITE);
    setShowActiviteForm(false);
  }

  async function loadActiviteDetail(activite) {
    if (!activite?.id) return;
    setDetailLoading(true);
    try {
      const { data } = await api.get('/cotisations', {
        params: { activiteId: activite.id, limit: 500 },
      });
      setDetailItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger le détail');
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openActiviteDetail(row) {
    const meta = activites.find((a) => a.id === row.id) || row;
    if (detailActivite?.id === meta.id) {
      setDetailActivite(null);
      setDetailItems([]);
      setExpandedRegionId(null);
      return;
    }
    setDetailActivite(meta);
    setExpandedRegionId(null);
    await loadActiviteDetail(meta);
  }

  function closeActiviteDetail() {
    setDetailActivite(null);
    setDetailItems([]);
    setExpandedRegionId(null);
  }

  async function submitActivite(e) {
    e.preventDefault();
    setSavingActivite(true);
    setMsg('');
    setError('');
    try {
      await api.post('/activites', {
        nom: activiteForm.nom.trim(),
        prefixeIdPaiement: activiteForm.prefixeIdPaiement.trim(),
        montantDefaut: activiteForm.montantDefaut === '' ? null : Number(activiteForm.montantDefaut),
        visibilite: activiteForm.visibilite,
        active: activiteForm.active,
      });
      setMsg('Activité créée');
      resetActiviteForm();
      await Promise.all([loadActivites(), loadStats()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création de l’activité');
    } finally {
      setSavingActivite(false);
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
              <span>Versé sur l’annuel</span>
              <strong>
                {formatMoney(montantVerseParToutesLesRegions)}
                <small> sur {formatMoney(montantAnnuel)}</small>
              </strong>
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
            <div className="cotis-panel-head">
              <h2>Montant par activité</h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setShowActiviteForm((open) => !open);
                  setActiviteForm(EMPTY_ACTIVITE);
                  setError('');
                }}
              >
                {showActiviteForm ? 'Fermer' : 'Ajouter une activité'}
              </button>
            </div>
            {showActiviteForm && (
              <form className="cotis-form cotis-activite-form" onSubmit={submitActivite}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cotis-act-nom">Nom</label>
                    <input
                      id="cotis-act-nom"
                      value={activiteForm.nom}
                      onChange={(e) => setActiviteForm((f) => ({ ...f, nom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cotis-act-prefixe">Préfixe ID paiement</label>
                    <input
                      id="cotis-act-prefixe"
                      value={activiteForm.prefixeIdPaiement}
                      onChange={(e) =>
                        setActiviteForm((f) => ({ ...f, prefixeIdPaiement: e.target.value }))
                      }
                      required
                      placeholder="ex. EYAWA"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cotis-act-montant">Montant défaut (FCFA)</label>
                    <input
                      id="cotis-act-montant"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={activiteForm.montantDefaut}
                      onChange={(e) =>
                        setActiviteForm((f) => ({ ...f, montantDefaut: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cotis-act-active">Statut</label>
                    <select
                      id="cotis-act-active"
                      value={activiteForm.active ? '1' : '0'}
                      onChange={(e) =>
                        setActiviteForm((f) => ({ ...f, active: e.target.value === '1' }))
                      }
                    >
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="cotis-act-visibilite">Visible par</label>
                  <select
                    id="cotis-act-visibilite"
                    value={activiteForm.visibilite}
                    onChange={(e) =>
                      setActiviteForm((f) => ({ ...f, visibilite: e.target.value }))
                    }
                  >
                    {ACTIVITE_VISIBILITE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cotis-activite-form-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetActiviteForm}>
                    Annuler
                  </button>
                  <button type="submit" className="btn" disabled={savingActivite}>
                    {savingActivite ? 'Enregistrement…' : 'Créer'}
                  </button>
                </div>
              </form>
            )}
            {totauxParActivite.length === 0 ? (
              <p className="muted">Aucune activité</p>
            ) : (
              <ul className="cotis-activite-totals">
                {totauxParActivite.map((a) => (
                  <li key={a.id || a.nom}>
                    <div className="cotis-activite-totals-main">
                      <strong>{a.nom}</strong>
                      <em>
                        {a.versements > 0
                          ? `${a.versements} versement${a.versements > 1 ? 's' : ''}`
                          : 'Aucun versement'}
                        {isActiviteRegionale(a) ? ' · par région' : ''}
                      </em>
                    </div>
                    <div className="cotis-activite-totals-side">
                      <span className="cotis-activite-totals-amount">{formatMoney(a.percu)}</span>
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm${
                          detailActivite?.id === a.id ? ' is-active' : ''
                        }`}
                        onClick={() => openActiviteDetail(a)}
                      >
                        {detailActivite?.id === a.id ? 'Fermer' : 'Détail'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {detailActivite && (
          <div className="cotis-panel cotis-detail-panel">
            <div className="cotis-panel-head">
              <div>
                <h2>
                  {isActiviteRegionale(detailActivite)
                    ? `${detailActivite.nom} — paiements par région`
                    : `Détail — ${detailActivite.nom}`}
                </h2>
                {montantCible(detailActivite) != null && (
                  <p className="muted cotis-detail-sub">
                    {Number(montantCible(detailActivite)).toLocaleString('fr-FR')} F par région,
                    payable en une ou plusieurs fois
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeActiviteDetail}>
                Fermer
              </button>
            </div>
            {detailLoading ? (
              <p className="muted">Chargement…</p>
            ) : isActiviteRegionale(detailActivite) ? (
              <ul className="cotis-membres-list">
                {detailParRegion.map((region) => {
                  const open = expandedRegionId === region.id;
                  return (
                    <li key={region.id} className={`cotis-membre-card${open ? ' is-open' : ''}`}>
                      <button
                        type="button"
                        className="cotis-membre-head"
                        onClick={() => setExpandedRegionId(open ? null : region.id)}
                        aria-expanded={open}
                      >
                        <div>
                          <strong>{region.nom}</strong>
                          <em>
                            {region.nbVersements > 0
                              ? `${region.nbVersements} versement${
                                  region.nbVersements > 1 ? 's' : ''
                                }`
                              : 'Aucun versement'}
                            {region.restant != null && region.total > 0
                              ? region.restant > 0
                                ? ` · reste ${formatMoney(region.restant)}`
                                : ' · soldé'
                              : ''}
                          </em>
                        </div>
                        <span className="cotis-activite-totals-amount">
                          {region.cible != null
                            ? `${formatMoney(region.total)} / ${formatMoney(region.cible)}`
                            : formatMoney(region.total)}
                        </span>
                      </button>
                      {open &&
                        (region.cotisations.length === 0 ? (
                          <p className="muted">Aucun paiement pour cette région.</p>
                        ) : (
                          <ul className="cotis-membre-activites">
                            {region.cotisations.map((cotisation) => (
                              <li key={cotisation.id}>
                                <div className="cotis-membre-activite">
                                  <div>
                                    <strong>
                                      {cotisation.membre?.prenom} {cotisation.membre?.nom}
                                    </strong>
                                    <em>{cotisation.idPaiement}</em>
                                    {(cotisation.versements || []).length > 0 && (
                                      <ul className="cotis-versements">
                                        {cotisation.versements.map((v) => (
                                          <li key={v.id}>
                                            {formatDateHeure(v.datePaiement)} · {moyenPaiement(v)} ·{' '}
                                            {Number(v.montant).toLocaleString('fr-FR')} F
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div className="cotis-list-meta">
                                    <span>{formatMoney(cotisation.total)}</span>
                                    <button
                                      type="button"
                                      className="btn-cotis-delete"
                                      disabled={deletingId === cotisation.id}
                                      onClick={() =>
                                        removePayment({
                                          id: cotisation.id,
                                          idPaiement: cotisation.idPaiement,
                                          membre: cotisation.membre,
                                        })
                                      }
                                      title="Supprimer ce paiement"
                                    >
                                      {deletingId === cotisation.id ? '…' : 'Supprimer'}
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ))}
                    </li>
                  );
                })}
              </ul>
            ) : detailParMembre.length === 0 ? (
              <p className="muted">Aucun paiement pour cette activité.</p>
            ) : (
              <ul className="cotis-membres-list">
                {detailParMembre.map((membre) => (
                  <li key={membre.id} className="cotis-membre-card is-open">
                    <div className="cotis-membre-head">
                      <div>
                        <strong>
                          {membre.prenom} {membre.nom}
                        </strong>
                        <em>
                          {membre.idMembre}
                          {membre.contact ? ` · ${membre.contact}` : ''}
                          {` · ${membre.nbVersements} versement${
                            membre.nbVersements > 1 ? 's' : ''
                          }`}
                        </em>
                      </div>
                      <span className="cotis-activite-totals-amount">
                        {formatMoney(membre.total)}
                      </span>
                    </div>
                    <ul className="cotis-membre-activites">
                      {membre.cotisations.map((cotisation) => (
                        <li key={cotisation.id}>
                          <div className="cotis-membre-activite">
                            <div>
                              <strong>{cotisation.activite}</strong>
                              <em>{cotisation.idPaiement}</em>
                              {(cotisation.versements || []).length > 0 && (
                                <ul className="cotis-versements">
                                  {cotisation.versements.map((v) => (
                                    <li key={v.id}>
                                      {formatDateHeure(v.datePaiement)} · {moyenPaiement(v)} ·{' '}
                                      {Number(v.montant).toLocaleString('fr-FR')} F
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="cotis-list-meta">
                              <span>{formatMoney(cotisation.total)}</span>
                              <button
                                type="button"
                                className="btn-cotis-delete"
                                disabled={deletingId === cotisation.id}
                                onClick={() =>
                                  removePayment({
                                    id: cotisation.id,
                                    idPaiement: cotisation.idPaiement,
                                    membre: {
                                      prenom: membre.prenom,
                                      nom: membre.nom,
                                    },
                                  })
                                }
                                title="Supprimer ce paiement"
                              >
                                {deletingId === cotisation.id ? '…' : 'Supprimer'}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
                      {Number(a.montantDefaut) > 0
                        ? ` (${Number(a.montantDefaut).toLocaleString('fr-FR')} F)`
                        : ''}
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
                {montantFixeManuel != null && (
                  <p className="muted tiny">
                    Montant fixe {montantFixeManuel.toLocaleString('fr-FR')} F, payable en une ou
                    plusieurs fois.
                  </p>
                )}
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

          <div className="cotis-panel cotis-membres-panel">
            <div className="cotis-panel-head">
              <h2>Membres ayant payé</h2>
              <div className="cotis-panel-tools">
                <form className="cotis-search" onSubmit={searchPayment}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, prénom ou ID membre…"
                    aria-label="Rechercher un membre"
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
            {membresAyantPaye.length === 0 ? (
              <p className="muted">Aucun membre n’a encore effectué de paiement.</p>
            ) : (
              <ul className="cotis-membres-list">
                {membresAyantPaye.map((membre) => {
                  const expanded = expandedMembreId === membre.id;
                  return (
                  <li key={membre.id} className={`cotis-membre-card${expanded ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="cotis-membre-head"
                      onClick={() =>
                        setExpandedMembreId(expanded ? null : membre.id)
                      }
                      aria-expanded={expanded}
                    >
                      <div>
                        <strong>
                          {membre.prenom} {membre.nom}
                        </strong>
                        <em>
                          {membre.idMembre}
                          {membre.contact ? ` · ${membre.contact}` : ''}
                          {` · ${membre.nbVersements} versement${
                            membre.nbVersements > 1 ? 's' : ''
                          }`}
                        </em>
                      </div>
                      <span className="cotis-activite-totals-amount">
                        {formatMoney(membre.total)}
                      </span>
                    </button>
                    {expanded && (
                    <ul className="cotis-membre-activites">
                      {membre.cotisations.map((cotisation) => (
                        <li key={cotisation.id}>
                          <div className="cotis-membre-activite">
                            <div>
                              <strong>{cotisation.activite}</strong>
                              <em>{cotisation.idPaiement}</em>
                              {(cotisation.versements || []).length > 0 && (
                                <ul className="cotis-versements">
                                  {cotisation.versements.map((v) => (
                                    <li key={v.id}>
                                      {formatDateHeure(v.datePaiement)} · {moyenPaiement(v)} ·{' '}
                                      {Number(v.montant).toLocaleString('fr-FR')} F
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="cotis-list-meta">
                              <span>{formatMoney(cotisation.total)}</span>
                              <button
                                type="button"
                                className="btn-cotis-delete"
                                disabled={deletingId === cotisation.id}
                                onClick={() =>
                                  removePayment({
                                    id: cotisation.id,
                                    idPaiement: cotisation.idPaiement,
                                    membre: {
                                      prenom: membre.prenom,
                                      nom: membre.nom,
                                    },
                                  })
                                }
                                title="Supprimer ce paiement"
                              >
                                {deletingId === cotisation.id ? '…' : 'Supprimer'}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    )}
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
