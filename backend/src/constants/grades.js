/** Dernier niveau hiérarchique réservé aux titres de coordination */
const TITRE_MAX_NIVEAU = 4;

/** Titres de coordination (hors grades du mouvement) */
const TITRES = [
  { nom: 'Coordinateur Général (CG)', niveauHierarchique: 1 },
  { nom: 'Coordinateur de Région (CDR)', niveauHierarchique: 2 },
  { nom: 'Coordinateur de District (CDD)', niveauHierarchique: 3 },
  { nom: 'Coordinateur de Paroisse (CDP)', niveauHierarchique: 4 },
];

/** Grades du mouvement */
const GRADES = [
  { nom: 'Commissaire National (CN)', niveauHierarchique: 5 },
  { nom: 'Commissaire National Adjoint (CNA)', niveauHierarchique: 6 },
  { nom: 'Commissaire de Région (CR)', niveauHierarchique: 7 },
  { nom: 'Commissaire de District (CD)', niveauHierarchique: 8 },
  { nom: 'Chef de Troupe (CT)', niveauHierarchique: 9 },
  { nom: 'Chef de Troupe Adjoint (CTA)', niveauHierarchique: 10 },
  { nom: 'Chef de Patrouille (CP)', niveauHierarchique: 11 },
  { nom: 'Sous chef de patrouille (SP)', niveauHierarchique: 12 },
  { nom: 'Comité de Jeunesse Locale (CLJ)', niveauHierarchique: 13 },
];

const GRADE_DEFAULT = 'Sous chef de patrouille (SP)';

const ROLES = [...TITRES, ...GRADES];

const TITRE_NAMES = new Set(TITRES.map((t) => t.nom));

function isTitreNom(nom) {
  return TITRE_NAMES.has(nom);
}

function isTitreNiveau(niveau) {
  return Number(niveau) <= TITRE_MAX_NIVEAU;
}

/** Anciens noms de rôles → titres ou grades actuels */
const GRADE_MIGRATIONS = {
  'Secrétaire général': 'Coordinateur Général (CG)',
  'Coordinateur général': 'Coordinateur Général (CG)',
  'Coordinateur général (C.G.)': 'Coordinateur Général (CG)',
  'Coordinateurs de région (C.D.R.)': 'Coordinateur de Région (CDR)',
  'Coordinateur régional': 'Coordinateur de Région (CDR)',
  'Coordinateurs de district (C.D.D.)': 'Coordinateur de District (CDD)',
  'Coordinateur de district': 'Coordinateur de District (CDD)',
  'Coordinateurs de paroisse (C.D.P.)': 'Coordinateur de Paroisse (CDP)',
  'Coordination de paroisse': 'Coordinateur de Paroisse (CDP)',
  'Chefs de troupe (C.T.)': 'Chef de Troupe (CT)',
  CT: 'Chef de Troupe (CT)',
  'Chefs de troupe adjoints (C.T.A.)': 'Chef de Troupe Adjoint (CTA)',
  CTA: 'Chef de Troupe Adjoint (CTA)',
  'Chefs de patrouille (C.P.)': 'Chef de Patrouille (CP)',
  CP: 'Chef de Patrouille (CP)',
  'Sous-chefs de patrouille (S.P.)': 'Sous chef de patrouille (SP)',
  SP: 'Sous chef de patrouille (SP)',
  'Membres actifs': GRADE_DEFAULT,
  Membres: GRADE_DEFAULT,
  CLJ: 'Comité de Jeunesse Locale (CLJ)',
  CN: 'Commissaire National (CN)',
  CNA: 'Commissaire National Adjoint (CNA)',
  CR: 'Commissaire de Région (CR)',
  CD: 'Commissaire de District (CD)',
};

module.exports = {
  TITRE_MAX_NIVEAU,
  TITRES,
  GRADES,
  GRADE_DEFAULT,
  ROLES,
  TITRE_NAMES,
  isTitreNom,
  isTitreNiveau,
  GRADE_MIGRATIONS,
};
