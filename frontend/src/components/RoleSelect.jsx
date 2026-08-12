import { splitTitresAndGrades } from '../utils/roleDisplay';

/**
 * Sélecteur Titres (CG, CDR, CDD, CDP) + Grades du mouvement.
 * gradesOnly : inscription membre — grades uniquement.
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
  const label = gradesOnly ? 'Grades' : 'Titre / Grades';

  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
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
        {gradesOnly ? (
          grades.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))
        ) : (
          <>
            {titres.length > 0 && (
              <optgroup label="Titre">
                {titres.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </optgroup>
            )}
            {grades.length > 0 && (
              <optgroup label="Grades">
                {grades.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </optgroup>
            )}
          </>
        )}
      </select>
    </div>
  );
}
