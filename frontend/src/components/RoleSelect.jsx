import { useMemo } from 'react';
import { isTitreRole, splitTitresAndGrades } from '../utils/roleDisplay';
import './RoleSelect.css';

/**
 * Deux champs distincts : Titre et Grades (un seul roleId en base).
 * gradesOnly : inscription — champ Grades uniquement.
 */
export default function RoleSelect({
  roles,
  value,
  onChange,
  name,
  id,
  required = false,
  gradesOnly = false,
  disabled = false,
}) {
  const { titres, grades } = splitTitresAndGrades(roles);
  const options = useMemo(() => [...titres, ...grades], [titres, grades]);
  const currentRole = options.find((r) => String(r.id) === String(value));

  const titreValue =
    currentRole && isTitreRole(currentRole) ? String(currentRole.id) : '';
  const gradeValue =
    currentRole && !isTitreRole(currentRole) ? String(currentRole.id) : '';

  const emitChange = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
  };

  const onTitreChange = (e) => {
    const next = e.target.value;
    emitChange(next);
  };

  const onGradeChange = (e) => {
    const next = e.target.value;
    emitChange(next);
  };

  if (gradesOnly) {
    return (
      <div className="form-group">
        <label htmlFor={id}>
          Grades
          {required && <span className="req"> *</span>}
        </label>
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        >
          <option value="">Sélectionner…</option>
          {grades.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="role-fields">
      <div className="form-group">
        <label htmlFor={`${id}-titre`}>Titre</label>
        <select
          id={`${id}-titre`}
          value={titreValue}
          onChange={onTitreChange}
          disabled={disabled}
        >
          <option value="">—</option>
          {titres.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${id}-grade`}>
          Grades
          {required && <span className="req"> *</span>}
        </label>
        <select
          id={`${id}-grade`}
          value={gradeValue}
          onChange={onGradeChange}
          disabled={disabled}
        >
          <option value="">—</option>
          {grades.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </div>
      {required && (
        <input type="hidden" name={name} value={value || ''} required={required} aria-hidden="true" />
      )}
    </div>
  );
}
