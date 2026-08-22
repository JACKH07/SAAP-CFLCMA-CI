import { useState } from 'react';

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Liste déroulante avec recherche : clic pour tout voir, saisie pour filtrer.
 * allowCreate : proposer d’ajouter un nom absent de la liste.
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
  placeholder = 'Rechercher ou choisir…',
  emptyListLabel = 'Aucun résultat',
  allowCreate = true,
}) {
  const [open, setOpen] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const listId = `${id}-list`;
  const query = filterActive ? normalizeSearch(value) : '';
  const exact = items.find((item) => normalizeSearch(item.nom) === normalizeSearch(value));
  const displayed = query
    ? items.filter((item) => normalizeSearch(item.nom).includes(query))
    : items;

  function openList() {
    if (disabled) return;
    setOpen(true);
    setFilterActive(false);
  }

  return (
    <div className={`form-group autocomplete${open && !disabled ? ' is-open' : ''}`}>
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
            setFilterActive(true);
            setOpen(true);
          }}
          onFocus={openList}
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
            if (disabled) return;
            setOpen((isOpen) => !isOpen);
            setFilterActive(false);
            const input = document.getElementById(id);
            if (input) input.focus();
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
              className={query && normalizeSearch(item.nom).includes(query) ? 'is-match' : undefined}
              aria-selected={String(item.id) === String(selectedId)}
              onMouseDown={() => {
                onSelect(item);
                setFilterActive(false);
                setOpen(false);
              }}
            >
              {item.nom}
            </button>
          ))}
          {allowCreate && value.trim() && !exact && (
            <button type="button" className="is-create" onMouseDown={() => setOpen(false)}>
              Ajouter « {value.trim()} »
            </button>
          )}
          {displayed.length === 0 && !allowCreate && (
            <div className="autocomplete-empty">
              {items.length === 0 ? emptyListLabel : 'Aucun résultat'}
            </div>
          )}
          {displayed.length === 0 && allowCreate && !value.trim() && (
            <div className="autocomplete-empty">{emptyListLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
