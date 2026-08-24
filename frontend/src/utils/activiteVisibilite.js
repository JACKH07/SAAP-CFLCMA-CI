export const ACTIVITE_VISIBILITE = {
  TOUS: 'TOUS',
  REGION: 'REGION',
};

export const ACTIVITE_VISIBILITE_OPTIONS = [
  { value: ACTIVITE_VISIBILITE.TOUS, label: 'Tous les membres' },
  {
    value: ACTIVITE_VISIBILITE.REGION,
    label: 'Coordinateur et commissaire de région',
  },
];

export function labelVisibilite(value) {
  return (
    ACTIVITE_VISIBILITE_OPTIONS.find((option) => option.value === value)?.label ||
    'Tous les membres'
  );
}

export function isActiviteRegionale(activite) {
  return activite?.visibilite === ACTIVITE_VISIBILITE.REGION;
}
