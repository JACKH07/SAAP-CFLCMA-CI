/** Grades du mouvement (hors Coordinateur général SAAP) */
const GRADES = [
  { nom: 'Commissaire National (CN)', niveauHierarchique: 2 },
  { nom: 'Commissaire National Adjoint (CNA)', niveauHierarchique: 3 },
  { nom: 'Commissaire de Région (CR)', niveauHierarchique: 4 },
  { nom: 'Commissaire de District (CD)', niveauHierarchique: 5 },
  { nom: 'Chef de Troupe (CT)', niveauHierarchique: 6 },
  { nom: 'Chef de Troupe Adjoint (CTA)', niveauHierarchique: 7 },
  { nom: 'Chef de Patrouille (CP)', niveauHierarchique: 8 },
  { nom: 'Sous chef de patrouille (SP)', niveauHierarchique: 9 },
  { nom: 'Comité de Jeunesse Locale (CLJ)', niveauHierarchique: 10 },
];

const GRADE_DEFAULT = 'Sous chef de patrouille (SP)';

const ROLES = [
  { nom: 'Coordinateur général (C.G.)', niveauHierarchique: 1 },
  ...GRADES,
];

/** Anciens noms de rôles → nouveaux grades */
const GRADE_MIGRATIONS = {
  'Secrétaire général': 'Coordinateur général (C.G.)',
  'Coordinateur général': 'Coordinateur général (C.G.)',
  'Coordinateurs de région (C.D.R.)': 'Commissaire de Région (CR)',
  'Coordinateur régional': 'Commissaire de Région (CR)',
  'Coordinateurs de district (C.D.D.)': 'Commissaire de District (CD)',
  'Coordinateur de district': 'Commissaire de District (CD)',
  'Coordinateurs de paroisse (C.D.P.)': 'Chef de Troupe (CT)',
  'Coordination de paroisse': 'Chef de Troupe (CT)',
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
  GRADES,
  GRADE_DEFAULT,
  ROLES,
  GRADE_MIGRATIONS,
};
