import { useId, useState } from 'react';
import './PasswordInput.css';

function EyeIcon({ crossed }) {
  if (crossed) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7-.5 1.2-1.2 2.3-2.1 3.3M6.1 6.1C4.2 7.4 2.7 9.1 1.5 12c1.7 3.9 6 7 10.5 7 1.5 0 2.9-.3 4.2-.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Champ mot de passe avec bascule afficher / masquer (œil).
 */
export default function PasswordInput({
  id,
  name = 'password',
  value,
  onChange,
  label,
  required = false,
  autoComplete = 'current-password',
  placeholder,
  minLength,
  disabled = false,
  className = '',
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`form-group password-field ${className}`.trim()}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className="password-field__wrap">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          disabled={disabled}
          className="password-field__input"
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          tabIndex={0}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
    </div>
  );
}
