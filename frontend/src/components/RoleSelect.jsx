import { useMemo } from 'react';
import { isTitreRole, splitTitresAndGrades } from '../utils/roleDisplay';
import './RoleSelect.css';

/**
 * Deux champs distincts : Titre et Grades (un seul roleId en base).
 * gradesOnly : champ Grades uniquement.
 * split : Titre et Grades en deux champs séparés (grille d'inscription).
 */
export default function RoleSelect({
  roles,
  value,
  onChange,
  name,
  id,
  required = false,
  gradesOnly = false,
  split = false,
  disabled = false,
  emptyLabel,
}) {
  const { titres, grades } = splitTitresAndGrades(roles);
  const options = useMemo(() => [...titres, ...grades], [titres, grades]);
  const currentRole = options.find((r) => String(r.id) === String(value));

  const titreValue =
    currentRole && isTitreRole(currentRole) ? String(currentRole.id) : '';
  const gradeValue =
    currentRole && !isTitreRole(currentRole) ? String(currentRole.id) : '';
  const placeholder = emptyLabel ?? (split ? 'Veuillez sélectionner…' : '—');
  const gradeRequired = required && !titreValue;

  const emitChange = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
  };

  const onTitreChange = (e) => {
    emitChange(e.target.value);
  };

  const onGradeChange = (e) => {
    emitChange(e.target.value);
  };

  const titreField = (
    <div className="form-group">
      <label htmlFor={`${id}-titre`}>Titre</label>
      <select
        id={`${id}-titre`}
        value={titreValue}
        onChange={onTitreChange}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {titres.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nom}
          </option>
        ))}
      </select>
    </div>
  );

  const gradeField = (
    <div className="form-group">
      <label htmlFor={gradesOnly ? id : `${id}-grade`}>
        Grades
        {gradeRequired && <span className="req"> *</span>}
      </label>
      <select
        id={gradesOnly ? id : `${id}-grade`}
        name={gradesOnly ? name : undefined}
        value={gradesOnly ? value : gradeValue}
        onChange={gradesOnly ? onChange : onGradeChange}
        required={gradeRequired}
        disabled={disabled}
      >
        <option value="">{gradesOnly && !emptyLabel ? 'Sélectionner…' : placeholder}</option>
        {grades.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nom}
          </option>
        ))}
      </select>
    </div>
  );

  if (gradesOnly) {
    return gradeField;
  }

  if (split) {
    return (
      <>
        {titreField}
        {gradeField}
      </>
    );
  }

  return (
    <div className="role-fields">
      {titreField}
      {gradeField}
      {required && (
        <input type="hidden" name={name} value={value || ''} required={required} aria-hidden="true" />
      )}
    </div>
  );
}
