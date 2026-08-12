import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import api from '../../api/client';
import './AdminPages.css';

const TABS = [
  { id: 'region', label: 'Région' },
  { id: 'district', label: 'District' },
  { id: 'paroisse', label: 'Paroisse' },
  { id: 'communaute', label: 'Communauté' },
];

export default function AdminGeoPage() {
  const [tab, setTab] = useState('region');
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [paroisses, setParoisses] = useState([]);
  const [communautes, setCommunautes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [regionForm, setRegionForm] = useState({ nom: '', code: '' });
  const [districtForm, setDistrictForm] = useState({ nom: '', regionId: '' });
  const [paroisseForm, setParoisseForm] = useState({ nom: '', regionId: '', districtId: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [r, d, p, c] = await Promise.all([
        api.get('/regions'),
        api.get('/districts'),
        api.get('/paroisses', { params: { all: true } }),
        api.get('/communautes', { params: { all: true } }),
      ]);
      setRegions(r.data.data || []);
      setDistricts(d.data.data || []);
      setParoisses(p.data.data || []);
      setCommunautes(c.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const districtsForRegion = useMemo(() => {
    const rid = Number(paroisseForm.regionId);
    if (!rid) return districts;
    return districts.filter((d) => d.regionId === rid);
  }, [districts, paroisseForm.regionId]);

  async function submitRegion(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await api.post('/regions', {
        nom: regionForm.nom.trim(),
        code: regionForm.code.trim() || undefined,
      });
      setRegionForm({ nom: '', code: '' });
      setMsg('Région ajoutée');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création');
    } finally {
      setSaving(false);
    }
  }

  async function submitDistrict(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await api.post('/districts', {
        nom: districtForm.nom.trim(),
        regionId: Number(districtForm.regionId),
      });
      setDistrictForm((f) => ({ ...f, nom: '' }));
      setMsg('District ajouté');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création');
    } finally {
      setSaving(false);
    }
  }

  async function submitParoisse(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await api.post('/paroisses', {
        nom: paroisseForm.nom.trim(),
        districtId: Number(paroisseForm.districtId),
      });
      setParoisseForm((f) => ({ ...f, nom: '' }));
      setMsg('Paroisse ajoutée');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la création');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(type, item, label) {
    const cascade =
      type === 'regions'
        ? '\nLes districts, paroisses et communautés rattachés seront aussi supprimés.'
        : type === 'districts'
          ? '\nLes paroisses et communautés rattachés seront aussi supprimés.'
          : type === 'paroisses'
            ? '\nLes communautés rattachées seront aussi supprimées.'
            : '';
    if (
      !window.confirm(
        `Supprimer ${label} ?${cascade}\nLes membres et cotisations liés seront détachés (rattachement vidé).`
      )
    ) {
      return;
    }
    setDeletingId(item.id);
    setMsg('');
    setError('');
    try {
      const { data } = await api.delete(`/${type}/${item.id}`);
      setMsg(data.message || 'Supprimé');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  }

  function DeleteBtn({ item, type, label }) {
    const busy = deletingId === item.id;
    return (
      <button
        type="button"
        className="btn btn-secondary geo-delete-btn"
        disabled={busy}
        onClick={() => removeItem(type, item, label)}
      >
        {busy ? '…' : 'Supprimer'}
      </button>
    );
  }

  return (
    <AdminShell title="Territoire" crumbs={['Administration', 'Territoire']}>
      <section className="admin-page">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <p className="muted geo-delete-hint">
          La suppression retire l&apos;entité et, si besoin, ses sous-niveaux (districts, paroisses,
          communautés). Les membres et cotisations concernés sont détachés automatiquement.
        </p>

        <div className="bureau-mode-tabs" role="tablist" aria-label="Type de lieu">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => {
                setTab(t.id);
                setMsg('');
                setError('');
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'region' && (
          <>
            <form className="card" onSubmit={submitRegion}>
              <div className="card-head-simple">
                <h2>Nouvelle région</h2>
                <p className="muted">Le code est optionnel (généré automatiquement si vide)</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="geo-region-nom">Nom</label>
                  <input
                    id="geo-region-nom"
                    value={regionForm.nom}
                    onChange={(e) => setRegionForm((f) => ({ ...f, nom: e.target.value }))}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="geo-region-code">Code</label>
                  <input
                    id="geo-region-code"
                    value={regionForm.code}
                    onChange={(e) => setRegionForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    maxLength={20}
                    placeholder="Ex. ABJ"
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Ajouter la région'}
                </button>
              </div>
            </form>

            <div className="card">
              <div className="card-head-simple">
                <h2>Régions ({regions.length})</h2>
              </div>
              {loading ? (
                <p className="muted">Chargement…</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Code</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {regions.map((r) => (
                        <tr key={r.id}>
                          <td>{r.nom}</td>
                          <td>{r.code}</td>
                          <td className="geo-actions-cell">
                            <DeleteBtn item={r} type="regions" label={`la région « ${r.nom} »`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'district' && (
          <>
            <form className="card" onSubmit={submitDistrict}>
              <div className="card-head-simple">
                <h2>Nouveau district</h2>
                <p className="muted">Rattachez le district à une région existante</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="geo-dist-region">Région</label>
                  <select
                    id="geo-dist-region"
                    value={districtForm.regionId}
                    onChange={(e) => setDistrictForm((f) => ({ ...f, regionId: e.target.value }))}
                    required
                  >
                    <option value="">Choisir…</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="geo-dist-nom">Nom du district</label>
                  <input
                    id="geo-dist-nom"
                    value={districtForm.nom}
                    onChange={(e) => setDistrictForm((f) => ({ ...f, nom: e.target.value }))}
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Ajouter le district'}
                </button>
              </div>
            </form>

            <div className="card">
              <div className="card-head-simple">
                <h2>Districts ({districts.length})</h2>
              </div>
              {loading ? (
                <p className="muted">Chargement…</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>District</th>
                        <th>Région</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {districts.map((d) => (
                        <tr key={d.id}>
                          <td>{d.nom}</td>
                          <td>{d.region?.nom || '—'}</td>
                          <td className="geo-actions-cell">
                            <DeleteBtn item={d} type="districts" label={`le district « ${d.nom} »`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'paroisse' && (
          <>
            <form className="card" onSubmit={submitParoisse}>
              <div className="card-head-simple">
                <h2>Nouvelle paroisse</h2>
                <p className="muted">Choisissez la région puis le district</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="geo-par-region">Région</label>
                  <select
                    id="geo-par-region"
                    value={paroisseForm.regionId}
                    onChange={(e) =>
                      setParoisseForm((f) => ({
                        ...f,
                        regionId: e.target.value,
                        districtId: '',
                      }))
                    }
                    required
                  >
                    <option value="">Choisir…</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="geo-par-district">District</label>
                  <select
                    id="geo-par-district"
                    value={paroisseForm.districtId}
                    onChange={(e) => setParoisseForm((f) => ({ ...f, districtId: e.target.value }))}
                    required
                    disabled={!paroisseForm.regionId}
                  >
                    <option value="">Choisir…</option>
                    {districtsForRegion.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="geo-par-nom">Nom de la paroisse</label>
                  <input
                    id="geo-par-nom"
                    value={paroisseForm.nom}
                    onChange={(e) => setParoisseForm((f) => ({ ...f, nom: e.target.value }))}
                    required
                    maxLength={150}
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Ajouter la paroisse'}
                </button>
              </div>
            </form>

            <div className="card">
              <div className="card-head-simple">
                <h2>Paroisses ({paroisses.length})</h2>
              </div>
              {loading ? (
                <p className="muted">Chargement…</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Paroisse</th>
                        <th>District</th>
                        <th>Région</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {paroisses.map((p) => (
                        <tr key={p.id}>
                          <td>{p.nom}</td>
                          <td>{p.district?.nom || '—'}</td>
                          <td>{p.district?.region?.nom || '—'}</td>
                          <td className="geo-actions-cell">
                            <DeleteBtn item={p} type="paroisses" label={`la paroisse « ${p.nom} »`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'communaute' && (
          <div className="card">
            <div className="card-head-simple">
              <h2>Communautés ({communautes.length})</h2>
              <p className="muted">
                Les communautés sont créées à l&apos;inscription des membres. Vous pouvez supprimer
                celles sans membre rattaché.
              </p>
            </div>
            {loading ? (
              <p className="muted">Chargement…</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Communauté</th>
                      <th>Paroisse</th>
                      <th>District</th>
                      <th>Région</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {communautes.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nom}</td>
                        <td>{c.paroisse?.nom || '—'}</td>
                        <td>{c.paroisse?.district?.nom || '—'}</td>
                        <td>{c.paroisse?.district?.region?.nom || '—'}</td>
                        <td className="geo-actions-cell">
                          <DeleteBtn
                            item={c}
                            type="communautes"
                            label={`la communauté « ${c.nom} »`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
