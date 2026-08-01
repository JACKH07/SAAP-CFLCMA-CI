import { useEffect, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';

export default function AdminCotisationsPage() {
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

  async function loadList() {
    const { data } = await api.get('/cotisations', {
      params: { search: search || undefined, limit: 40 },
    });
    setItems(data.items || []);
  }

  useEffect(() => {
    Promise.all([
      api.get('/activites'),
      api.get('/membres', { params: { limit: 100, statut: 'VALIDE' } }),
      loadList(),
    ]).then(([a, m]) => {
      setActivites(a.data.data || []);
      setMembres(m.data.items || []);
    }).catch((e) => setError(e.response?.data?.message || 'Erreur de chargement'));
  }, []);

  async function searchPayment(e) {
    e.preventDefault();
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
      await loadList();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la saisie');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Paiements" crumbs={['Tableaux de bord', 'Paiements']}>
      <section className="stack">
        <p className="muted" style={{ marginTop: 0 }}>Recherche et saisie manuelle</p>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form className="card" onSubmit={searchPayment}>
          <div className="form-group">
            <label htmlFor="searchPay">Rechercher un ID paiement</label>
            <input
              id="searchPay"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="EYAWA-KOJA19950312"
            />
          </div>
          <button className="btn" type="submit">
            Rechercher
          </button>
        </form>

        <form className="card" onSubmit={submitManual}>
          <h2>Saisie manuelle</h2>
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
          <button className="btn btn-block" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer le paiement'}
          </button>
        </form>

        <div className="stack">
          {items.map((c) => (
            <div key={c.id} className="card">
              <strong>{c.idPaiement}</strong>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {c.membre?.prenom} {c.membre?.nom} · {c.activite?.nom}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
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
    </AdminShell>
  );
}
