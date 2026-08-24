import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PaymentMethodCard from '../components/PaymentMethodCard';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { paths } from '../config/env';
import { enabledPaymentMethods } from '../payments/paymentMethods';
import { toSameOriginCheckoutUrl } from '../payments/orangeWebpay';
import { formatDateHeure, moyenPaiement, totalVersements, montantCible, restantDu } from '../utils/paiement';
import { isActiviteRegionale } from '../utils/activiteVisibilite';
import './PaiementPage.css';

const METHODS = enabledPaymentMethods();

function mapPaymentError(error) {
  const code = error.response?.data?.code;
  const msg = error.response?.data?.message;
  if (code === 'PAYMENT_REFUSED') return 'Paiement refusé par l’opérateur.';
  if (code === 'PAYMENT_TIMEOUT') return 'Délai dépassé. Réessayez le paiement.';
  if (code === 'PAYMENT_PENDING') return msg || 'Paiement en attente de confirmation.';
  if (code === 'PROVIDER_UNAVAILABLE') {
    return 'Service de paiement temporairement indisponible.';
  }
  return msg || 'Échec du paiement';
}

export default function PaiementPage() {
  const { activiteId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const activiteId = paramId || searchParams.get('activiteId');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activite, setActivite] = useState(null);
  const [cotisation, setCotisation] = useState(null);
  const [montant, setMontant] = useState('');
  const [provider, setProvider] = useState(METHODS[0]?.id || 'ORANGE');
  const [phone, setPhone] = useState(user?.contact || '');
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [step, setStep] = useState('form');

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
          (c) =>
            String(c.activiteId) === String(activiteId) ||
            String(c.activite?.id) === String(activiteId)
        );
        setCotisation(mine || null);
      })
      .catch(() => setErr("Impossible de charger l'activité"))
      .finally(() => setLoadingMeta(false));
  }, [activiteId]);

  const dejaPaye = useMemo(
    () => totalVersements(cotisation),
    [cotisation]
  );
  const versements = cotisation?.versements || [];
  const cible = montantCible(activite);
  const restant = restantDu(activite, dejaPaye);
  const solde = restant === 0;
  const selectedMethod = useMemo(
    () => METHODS.find((m) => m.id === provider),
    [provider]
  );
  const montantValue = Number(montant);
  const hasMontant = Number.isFinite(montantValue) && montantValue > 0;

  useEffect(() => {
    if (restant == null || solde) return;
    setMontant(String(restant));
  }, [restant, solde]);

  function validateForm() {
    if (!hasMontant) {
      setErr('Saisissez un montant valide en FCFA');
      return false;
    }
    if (restant != null && montantValue > restant) {
      setErr(`Le montant restant est de ${restant.toLocaleString('fr-FR')} FCFA`);
      return false;
    }
    if (!provider) {
      setErr('Choisissez un moyen de paiement');
      return false;
    }
    if (!phone || String(phone).trim().length < 8) {
      setErr('Numéro de téléphone requis');
      return false;
    }
    return true;
  }

  function goRecap(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!validateForm()) return;
    setStep('recap');
  }

  async function refreshCotisation() {
    const cRes = await api.get('/cotisations/me');
    const mine = (cRes.data.data || []).find(
      (c) =>
        String(c.activiteId) === String(activiteId) ||
        String(c.activite?.id) === String(activiteId)
    );
    setCotisation(mine || null);
    return mine;
  }

  async function confirmPayment(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!validateForm()) {
      setStep('form');
      return;
    }
    const value = montantValue;
    setLoading(true);
    try {
      const { data } = await api.post('/cotisations', {
        modePaiement: 'MOBILE_MONEY',
        activiteId: Number(activiteId),
        provider,
        phone,
        montant: value,
      });
      const result = data.data || {};
      const status = String(result.status || '').toUpperCase();

      if (result.paymentUrl) {
        const checkoutUrl =
          provider === 'ORANGE'
            ? toSameOriginCheckoutUrl(result.paymentUrl)
            : result.paymentUrl;
        window.location.assign(checkoutUrl);
        return;
      }

      if (result.mock || status === 'SUCCESS' || status === 'SUCCESSFUL') {
        setMsg(
          result.mock
            ? 'Paiement simulé (mode test). Aucune redirection WebPay — désactivez PAYMENT_MOCK_MODE sur le serveur.'
            : result.message || 'Paiement enregistré'
        );
        setMontant('');
      } else if (status === 'FAILED') {
        setErr(result.message || 'Paiement refusé');
      } else {
        setErr(
          'Orange Money n’a pas renvoyé de lien WebPay. Vérifiez ORANGE_MONEY_ENV=dev, la devise OUV et les clés marchand.'
        );
      }

      if (result.cotisation) setCotisation(result.cotisation);
      else await refreshCotisation();
    } catch (error) {
      setErr(mapPaymentError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="stack paiement-page">
        <button
          type="button"
          className="paiement-back"
          onClick={() =>
            step === 'recap' ? setStep('form') : navigate(paths.mesCotisations)
          }
        >
          {step === 'recap' ? '← Modifier' : '← Mes cotisations'}
        </button>

        <div>
          <h1>{step === 'recap' ? 'Récapitulatif' : 'Paiement'}</h1>
          {step === 'recap' && (
            <p className="muted">Vérifiez les informations puis confirmez le paiement.</p>
          )}
        </div>

        {loadingMeta && <p className="muted">Chargement…</p>}
        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        {activite && (
          <>
            <div className="card paiement-activite">
              <strong>{activite.nom}</strong>
              <div className="muted tiny">
                {activite.prefixeIdPaiement}
                {isActiviteRegionale(activite) && (
                  <>
                    {' · '}
                    Paiement par région
                    {user?.region?.nom ? ` — ${user.region.nom}` : ''}
                  </>
                )}
              </div>
              {cible != null && (
                <p className="paiement-cible">
                  Montant fixe : {cible.toLocaleString('fr-FR')} FCFA — payable en une fois ou en
                  plusieurs versements.
                </p>
              )}
              <div className="paiement-deja">
                {cible != null ? (
                  <>
                    Versé : <strong>{dejaPaye.toLocaleString('fr-FR')} FCFA</strong>
                    {' · '}
                    Reste :{' '}
                    <strong>{Number(restant || 0).toLocaleString('fr-FR')} FCFA</strong>
                  </>
                ) : versements.length > 0 ? (
                  <>
                    {versements.length} versement{versements.length > 1 ? 's' : ''} · Total{' '}
                    <strong>{dejaPaye.toLocaleString('fr-FR')} FCFA</strong>
                  </>
                ) : (
                  <>
                    Total versé : <strong>{dejaPaye.toLocaleString('fr-FR')} FCFA</strong>
                  </>
                )}
              </div>
              {versements.length > 0 && (
                <ul className="paiement-versements">
                  {versements.map((v) => (
                    <li key={v.id}>
                      <span>
                        {formatDateHeure(v.datePaiement)} · {moyenPaiement(v)}
                      </span>
                      <strong>{Number(v.montant).toLocaleString('fr-FR')} FCFA</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {step === 'form' && solde && (
              <div className="card">
                <p className="muted">Cette cotisation est soldée. Aucun versement supplémentaire n’est nécessaire.</p>
              </div>
            )}

            {step === 'form' && !solde && (
            <form className="card" onSubmit={goRecap}>
              <div className="form-group">
                <label htmlFor="montant">
                  {restant != null
                    ? `Montant de ce versement (max ${restant.toLocaleString('fr-FR')} FCFA)`
                    : 'Montant (FCFA)'}
                </label>
                <input
                  id="montant"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={restant != null ? restant : undefined}
                  step="1"
                  placeholder={restant != null ? String(restant) : 'Ex. 2000'}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  required
                  autoFocus
                />
                {restant != null && restant > 0 && (
                  <p className="muted tiny">
                    Laissez {restant.toLocaleString('fr-FR')} F pour tout verser maintenant, ou
                    saisissez un montant inférieur.
                  </p>
                )}
              </div>

              <fieldset className="paiement-methods-fieldset">
                <legend>Moyen de paiement</legend>
                <div className="payment-methods" role="radiogroup" aria-label="Moyen de paiement">
                  {METHODS.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      selected={provider === method.id}
                      onSelect={setProvider}
                      disabled={loading}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="phone">
                  Numéro {selectedMethod ? `(${selectedMethod.shortName})` : ''}
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07 XX XX XX XX"
                  required
                />
              </div>

              <button
                className={`btn btn-block btn-pay ${hasMontant ? 'is-ready' : ''} ${
                  hasMontant && provider === 'ORANGE' ? 'is-orange' : ''
                } ${hasMontant && provider === 'WAVE' ? 'is-wave' : ''}`}
                type="submit"
                disabled={loading}
              >
                {selectedMethod
                  ? `Payer avec ${selectedMethod.name}`
                  : 'Payer par Mobile Money'}
              </button>
            </form>
            )}

            {step === 'recap' && (
            <form className="card paiement-recap" onSubmit={confirmPayment}>
              <dl className="paiement-recap-list">
                <div>
                  <dt>Activité</dt>
                  <dd>{activite.nom}</dd>
                </div>
                <div>
                  <dt>Montant</dt>
                  <dd>{montantValue.toLocaleString('fr-FR')} FCFA</dd>
                </div>
                <div>
                  <dt>Moyen</dt>
                  <dd>{selectedMethod?.name || provider}</dd>
                </div>
                <div>
                  <dt>Numéro</dt>
                  <dd>{phone}</dd>
                </div>
              </dl>
              <button
                className={`btn btn-block btn-pay is-ready ${
                  provider === 'ORANGE' ? 'is-orange' : ''
                } ${provider === 'WAVE' ? 'is-wave' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? 'Paiement…' : 'Confirmer le paiement'}
              </button>
            </form>
            )}
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
