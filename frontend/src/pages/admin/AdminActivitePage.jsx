import { useEffect, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import './AdminPages.css';

const EMPTY = {
  nom: '',
  prefixeIdPaiement: '',
  montantDefaut: '',
  active: true,
};

export default function AdminActivitePage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/activites', { params: { all: true } });
      setItems(data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(a) {
    setEditingId(a.id);
    setForm({
      nom: a.nom || '',
      prefixeIdPaiement: a.prefixeIdPaiement || '',
      montantDefaut: a.montantDefaut != null ? String(a.montantDefaut) : '',
      active: Boolean(a.active),
    });
    setMsg('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const payload = {
        nom: form.nom.trim(),
        prefixeIdPaiement: form.prefixeIdPaiement.trim(),
        montantDefaut: form.montantDefaut === '' ? null : Number(form.montantDefaut),
        active: form.active,
      };
      if (editingId) {
        await api.patch(`/activites/${editingId}`, payload);
        setMsg('Activité mise à jour');
      } else {
        await api.post('/activites', payload);
        setMsg('Activité créée');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a) {
    setError('');
    try {
      await api.patch(`/activites/${a.id}`, { active: !a.active });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec');
    }
  }

  return (
    <AdminShell title="Activités" crumbs={['Administration', 'Activités']}>
      <section className="admin-page">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form className="card" onSubmit={onSubmit}>
          <div className="card-head-simple">
            <h2>{editingId ? 'Modifier l’activité' : 'Nouvelle activité'}</h2>
            <p className="muted">Nom, préfixe de paiement et montant par défaut</p>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="act-nom">Nom</label>
              <input
                id="act-nom"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="act-prefixe">Préfixe ID paiement</label>
              <input
                id="act-prefixe"
                value={form.prefixeIdPaiement}
                onChange={(e) => setForm((f) => ({ ...f, prefixeIdPaiement: e.target.value }))}
                required
                placeholder="ex. EYAWA"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="act-montant">Montant défaut (FCFA)</label>
              <input
                id="act-montant"
                type="number"
                min="0"
                inputMode="numeric"
                value={form.montantDefaut}
                onChange={(e) => setForm((f) => ({ ...f, montantDefaut: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="act-active">Statut</label>
              <select
                id="act-active"
                value={form.active ? '1' : '0'}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div className="admin-form-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Annuler
              </button>
            )}
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="card-head-simple">
            <h2>Liste des activités</h2>
            <p className="muted">{items.length} activité(s)</p>
          </div>
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Préfixe</th>
                    <th>Montant</th>
                    <th>Cotisations</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.nom}</strong>
                      </td>
                      <td>
                        <code className="id-code">{a.prefixeIdPaiement}</code>
                      </td>
                      <td>
                        {a.montantDefaut != null
                          ? `${Number(a.montantDefaut).toLocaleString('fr-FR')} FCFA`
                          : '—'}
                      </td>
                      <td>{a._count?.cotisations ?? 0}</td>
                      <td>
                        <span className={`badge ${a.active ? 'badge-valide' : 'badge-attente'}`}>
                          {a.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(a)}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleActive(a)}>
                          {a.active ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="muted">
                        Aucune activité
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
