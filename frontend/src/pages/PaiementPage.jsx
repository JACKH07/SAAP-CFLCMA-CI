import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PaymentMethodCard from '../components/PaymentMethodCard';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { paths } from '../config/env';
import { enabledPaymentMethods } from '../payments/paymentMethods';
import {
  chromeIntentUrl,
  isAndroidDevice,
  toWebPayCheckoutUrl,
} from '../payments/orangeWebpay';
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
  const [pendingInfo, setPendingInfo] = useState(null);

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

  const dejaPaye = useMemo(() => Number(cotisation?.montantPaye || 0), [cotisation]);
  const selectedMethod = useMemo(
    () => METHODS.find((m) => m.id === provider),
    [provider]
  );

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

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setPendingInfo(null);
    const value = Number(montant);
    if (!Number.isFinite(value) || value <= 0) {
      setErr('Saisissez un montant valide en FCFA');
      return;
    }
    if (!provider) {
      setErr('Choisissez un moyen de paiement');
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
      const result = data.data || {};
      const status = String(result.status || '').toUpperCase();

      const checkoutUrl =
        provider === 'ORANGE'
          ? toWebPayCheckoutUrl(result.paymentUrl, result.payToken)
          : result.paymentUrl;
      if (checkoutUrl) {
        setPendingInfo({
          message:
            provider === 'ORANGE'
              ? 'Redirection vers la page Orange Money WebPay…'
              : 'Redirection vers la page de paiement…',
          paymentUrl: checkoutUrl,
          reference: result.referenceExterne,
          intercepted: false,
          provider,
        });
        window.setTimeout(() => {
          setPendingInfo((current) =>
            current ? { ...current, intercepted: true } : current
          );
        }, 1800);
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
          onClick={() => navigate(paths.mesCotisations)}
        >
          ← Mes cotisations
        </button>

        <div>
          <h1>Paiement</h1>
          <p className="muted">Saisissez le montant à verser — aucun montant fixe. Test Orange Money : 10.</p>
        </div>

        {loadingMeta && <p className="muted">Chargement…</p>}
        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}
        {pendingInfo && (
          <div className="alert alert-pending">
            <strong>En attente</strong>
            <p>{pendingInfo.message}</p>
            {pendingInfo.reference && (
              <p className="muted tiny">Réf. {pendingInfo.reference}</p>
            )}
            {pendingInfo.paymentUrl && (
              <>
                <a className="btn btn-block" href={pendingInfo.paymentUrl} target="_self">
                  {pendingInfo.provider === 'WAVE'
                    ? 'Ouvrir Wave'
                    : 'Ouvrir la page Orange Money'}
                </a>
                {pendingInfo.provider !== 'WAVE' &&
                  pendingInfo.intercepted &&
                  isAndroidDevice() && (
                    <a
                      className="btn btn-secondary btn-block"
                      href={chromeIntentUrl(pendingInfo.paymentUrl)}
                    >
                      Ouvrir dans Chrome (éviter Maxit)
                    </a>
                  )}
                {pendingInfo.provider !== 'WAVE' && pendingInfo.intercepted && (
                  <p className="muted tiny">
                    Si l’application Maxit s’est ouverte, revenez ici et utilisez le bouton
                    ci-dessus : le paiement sandbox se fait sur la page web Orange Money, pas
                    dans Maxit.
                  </p>
                )}
              </>
            )}
          </div>
        )}

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

              <button className="btn btn-block" type="submit" disabled={loading}>
                {loading
                  ? 'Paiement…'
                  : selectedMethod
                    ? `Payer avec ${selectedMethod.name}`
                    : 'Payer par Mobile Money'}
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
