/** Visible de tous les membres. */
const VISIBILITE_TOUS = 'TOUS';

/** Visible uniquement du coordinateur et du commissaire de région. */
const VISIBILITE_REGION = 'REGION';

const VISIBILITES = [VISIBILITE_TOUS, VISIBILITE_REGION];

function normalizeVisibilite(value) {
  const raw = String(value || VISIBILITE_TOUS).trim().toUpperCase();
  return VISIBILITES.includes(raw) ? raw : VISIBILITE_TOUS;
}

function isVisibiliteRegionale(value) {
  return normalizeVisibilite(value) === VISIBILITE_REGION;
}

module.exports = {
  VISIBILITE_TOUS,
  VISIBILITE_REGION,
  VISIBILITES,
  normalizeVisibilite,
  isVisibiliteRegionale,
};
