import { useState } from 'react';

/**
 * Liste déroulante saisissable : clic pour voir toutes les options,
 * saisie pour filtrer ou ajouter un nom absent de la base.
 */
export default function ComboboxField({
  id,
  label,
  required = false,
  value = '',
  onChange,
  items = [],
  selectedId = '',
  onSelect,
  disabled = false,
  placeholder = 'Choisir dans la liste ou saisir…',
  emptyListLabel = 'Aucun résultat',
}) {
  const [open, setOpen] = useState(false);
  const listId = `${id}-list`;
  const query = value.trim().toLowerCase();
  const exact = items.find((item) => item.nom.toLowerCase() === query);
  const displayed = query
    ? [
        ...items.filter((item) => item.nom.toLowerCase().includes(query)),
        ...items.filter((item) => !item.nom.toLowerCase().includes(query)),
      ]
    : items;

  return (
    <div className="form-group autocomplete">
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="req"> *</span>}
        </label>
      )}
      <div className="combobox">
        <input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        <button
          type="button"
          className="combobox-caret"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Afficher la liste"
          onMouseDown={(e) => {
            e.preventDefault();
            if (!disabled) setOpen((isOpen) => !isOpen);
          }}
        />
      </div>
      {open && !disabled && (
        <div id={listId} className="autocomplete-list" role="listbox">
          {displayed.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              className={query && item.nom.toLowerCase().includes(query) ? 'is-match' : undefined}
              aria-selected={String(item.id) === String(selectedId)}
              onMouseDown={() => {
                onSelect(item);
                setOpen(false);
              }}
            >
              {item.nom}
            </button>
          ))}
          {value.trim() && !exact && (
            <button type="button" className="is-create" onMouseDown={() => setOpen(false)}>
              Ajouter « {value.trim()} »
            </button>
          )}
          {items.length === 0 && !value.trim() && (
            <div className="autocomplete-empty">{emptyListLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
