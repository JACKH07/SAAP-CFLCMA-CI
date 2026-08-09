import './PaymentMethodCard.css';

/**
 * Carte de sélection d’un moyen de paiement (réutilisable, extensible).
 */
export default function PaymentMethodCard({ method, selected, onSelect, disabled = false }) {
  if (!method) return null;

  const isSelected = Boolean(selected);
  const className = [
    'payment-method-card',
    isSelected ? 'is-selected' : '',
    disabled || !method.enabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (!disabled && method.enabled) onSelect?.(method.id);
      }}
      aria-pressed={isSelected}
      disabled={disabled || !method.enabled}
      style={{
        '--pm-accent': method.accent,
        '--pm-logo-bg': method.logoBg,
      }}
    >
      <span className="payment-method-card__logo-wrap" aria-hidden="true">
        <img
          src={method.logo}
          alt=""
          className="payment-method-card__logo"
          loading="lazy"
        />
      </span>
      <span className="payment-method-card__meta">
        <span className="payment-method-card__name">{method.name}</span>
        {isSelected && <span className="payment-method-card__check">Sélectionné</span>}
      </span>
    </button>
  );
}
