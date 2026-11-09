const { AppError } = require('./errors');
const { hasAdminAccess } = require('./roles');
const { GRADE_MIGRATIONS } = require('../constants/grades');
const {
  VISIBILITE_TOUS,
  isVisibiliteRegionale,
} = require('../constants/activiteVisibilite');

const TITRE_COORDINATEUR_REGION = 'Coordinateur de Région (CDR)';
const GRADE_COMMISSAIRE_REGION = 'Commissaire de Région (CR)';

const OFFICIERS_REGION = new Set([
  TITRE_COORDINATEUR_REGION,
  GRADE_COMMISSAIRE_REGION,
  ...Object.entries(GRADE_MIGRATIONS)
    .filter(([, canonical]) => canonical === TITRE_COORDINATEUR_REGION || canonical === GRADE_COMMISSAIRE_REGION)
    .map(([alias]) => alias),
]);

function collectMembreRoleNames(membre) {
  return [
    membre?.titre?.nom,
    membre?.role?.nom,
    membre?.responsabiliteBureau,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function matchesOfficierRegion(name) {
  if (OFFICIERS_REGION.has(name)) return true;
  const lower = name.toLowerCase();
  return (
    /coordinateur\s+de\s+r[ée]gion/i.test(lower) ||
    /commissaire\s+de\s+r[ée]gion/i.test(lower)
  );
}

function isOfficierRegion(membre) {
  return collectMembreRoleNames(membre).some(matchesOfficierRegion);
}

function canSeeActivite(membre, activite) {
  if (!activite) return false;
  if (!isVisibiliteRegionale(activite.visibilite)) return true;
  return isOfficierRegion(membre);
}

function assertCanPayActivite({ acteur, payeur, activite }) {
  if (!activite) throw new AppError('Activité introuvable', 404);
  if (canSeeActivite(payeur, activite)) {
    if (isVisibiliteRegionale(activite.visibilite) && !payeur?.regionId && !hasAdminAccess(acteur)) {
      throw new AppError('Le paiement annuel est rattaché à une région', 400);
    }
    return;
  }
  if (hasAdminAccess(acteur)) return;
  throw new AppError(
    'Cette activité est réservée au coordinateur de région et au commissaire de région',
    403
  );
}

function filterActivitesForViewer(activites, viewer, { includeRestricted = false } = {}) {
  if (includeRestricted) return activites;
  return (activites || []).filter((activite) => canSeeActivite(viewer, activite));
}

module.exports = {
  VISIBILITE_TOUS,
  TITRE_COORDINATEUR_REGION,
  GRADE_COMMISSAIRE_REGION,
  isOfficierRegion,
  canSeeActivite,
  assertCanPayActivite,
  filterActivitesForViewer,
};
