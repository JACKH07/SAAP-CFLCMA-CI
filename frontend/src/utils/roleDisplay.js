/** Dernier niveau hiérarchique réservé aux titres de coordination */
export const TITRE_MAX_NIVEAU = 4;

/** niveaux 1–4 = Titres (CG, CDR, CDD, CDP), 5+ = Grades */
export function isTitreRole(role) {
  if (!role) return false;
  return Number(role.niveauHierarchique) <= TITRE_MAX_NIVEAU;
}

export function roleCategoryLabel(role) {
  return isTitreRole(role) ? 'Titre' : 'Grades';
}

export function titreNom(role) {
  return isTitreRole(role) ? role.nom : '—';
}

export function gradeNom(role) {
  if (!role?.nom) return '—';
  return isTitreRole(role) ? '—' : role.nom;
}

export function splitTitresAndGrades(roles = []) {
  const titres = roles.filter((r) => isTitreRole(r));
  const grades = roles.filter((r) => !isTitreRole(r));
  return { titres, grades };
}
