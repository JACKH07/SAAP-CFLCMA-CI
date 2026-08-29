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

export function titreNom(role, titre) {
  if (titre?.nom) return titre.nom;
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

/** Échelle 1 (CG) → 14 (Membres) — alignée sur les rôles en base */
export const RANK_LADDER = [
  { nom: 'Coordinateur Général (CG)', niveau: 1, short: 'CG' },
  { nom: 'Coordinateur de Région (CDR)', niveau: 2, short: 'CDR' },
  { nom: 'Coordinateur de District (CDD)', niveau: 3, short: 'CDD' },
  { nom: 'Coordinateur de Paroisse (CDP)', niveau: 4, short: 'CDP' },
  { nom: 'Commissaire National (CN)', niveau: 5, short: 'CN' },
  { nom: 'Commissaire National Adjoint (CNA)', niveau: 6, short: 'CNA' },
  { nom: 'Commissaire de Région (CR)', niveau: 7, short: 'CR' },
  { nom: 'Commissaire de District (CD)', niveau: 8, short: 'CD' },
  { nom: 'Chef de Troupe (CT)', niveau: 9, short: 'CT' },
  { nom: 'Chef de Troupe Adjoint (CTA)', niveau: 10, short: 'CTA' },
  { nom: 'Chef de Patrouille (CP)', niveau: 11, short: 'CP' },
  { nom: 'Sous chef de patrouille (SP)', niveau: 12, short: 'SP' },
  { nom: 'Comité de Jeunesse Locale (CLJ)', niveau: 13, short: 'CLJ' },
  { nom: 'Membres', niveau: 14, short: 'Membre' },
];

const RANK_NIVEAU_MAX = 14;
const RANK_NIVEAU_MIN = 1;

/** Rang affiché : titre de coordination s’il existe, sinon le grade */
export function effectiveRank(profile) {
  if (profile?.titre?.nom) return profile.titre;
  return profile?.role || null;
}

export function rankProgress(profile) {
  const rank = effectiveRank(profile);
  const n = Number(rank?.niveauHierarchique) || RANK_NIVEAU_MAX;
  const pct = Math.round(
    ((RANK_NIVEAU_MAX - n) / (RANK_NIVEAU_MAX - RANK_NIVEAU_MIN)) * 100,
  );
  const next = RANK_LADDER.find((r) => r.niveau === n - 1);
  return {
    pct: Math.max(0, Math.min(100, pct)),
    nextNom: next?.nom || null,
    nextShort: next?.short || null,
    isTop: n <= RANK_NIVEAU_MIN,
  };
}
