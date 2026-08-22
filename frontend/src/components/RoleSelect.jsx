import { splitTitresAndGrades } from '../utils/roleDisplay';
import './RoleSelect.css';

/**
 * Titre et grade sont indépendants (deux valeurs distinctes).
 * gradesOnly : champ Grades uniquement.
 * split : Titre et Grades en deux champs séparés (grille d'inscription).
 */
export default function RoleSelect({
  roles,
  value,
  titreValue = '',
  onChange,
  name,
  titreName = 'titreId',
  id,
  required = false,
  gradesOnly = false,
  split = false,
  disabled = false,
  emptyLabel,
}) {
  const { titres, grades } = splitTitresAndGrades(roles);
  const placeholder = emptyLabel ?? (split ? 'Veuillez sélectionner…' : '—');

  const emit = (fieldName, nextValue) => {
    onChange({ target: { name: fieldName, value: nextValue } });
  };

  const titreField = (
    <div className="form-group">
      <label htmlFor={`${id}-titre`}>Titre</label>
      <select
        id={`${id}-titre`}
        name={titreName}
        value={titreValue || ''}
        onChange={(e) => emit(titreName, e.target.value)}
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
        {required && <span className="req"> *</span>}
      </label>
      <select
        id={gradesOnly ? id : `${id}-grade`}
        name={name}
        value={value || ''}
        onChange={(e) => emit(name, e.target.value)}
        required={required}
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
      <div className="role-fields form-span-2">
        {titreField}
        {gradeField}
      </div>
    );
  }

  return (
    <div className="role-fields">
      {titreField}
      {gradeField}
    </div>
  );
}
