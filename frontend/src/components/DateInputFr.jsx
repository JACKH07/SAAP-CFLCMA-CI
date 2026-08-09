import { useEffect, useState } from 'react';
import { frToIso, isoToFr, maskFrDate } from '../utils/dateFr';

/**
 * Champ date affiché en JJ/MM/AAAA.
 * La valeur émise (onChange) reste au format ISO YYYY-MM-DD pour l’API.
 */
export default function DateInputFr({
  id,
  name,
  value = '',
  onChange,
  required = false,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const [display, setDisplay] = useState(() => isoToFr(value));

  useEffect(() => {
    setDisplay(isoToFr(value));
  }, [value]);

  function handleChange(e) {
    const masked = maskFrDate(e.target.value);
    setDisplay(masked);
    const iso = frToIso(masked);
    if (typeof onChange === 'function') {
      onChange({
        target: {
          name,
          value: masked.length === 10 ? iso : '',
        },
      });
    }
  }

  function handleBlur() {
    if (display && display.length === 10 && !frToIso(display)) {
      setDisplay('');
      if (typeof onChange === 'function') {
        onChange({ target: { name, value: '' } });
      }
    }
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="JJ/MM/AAAA"
      className={className}
      aria-label={ariaLabel || 'Date au format JJ/MM/AAAA'}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      disabled={disabled}
      pattern="\d{2}/\d{2}/\d{4}"
      maxLength={10}
      title="Format attendu : JJ/MM/AAAA"
    />
  );
}
