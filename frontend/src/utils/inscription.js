import { hasAdminAccess } from './roles';
import { paths } from '../config/env';

export const PREFIXE_INSCRIPTION = 'INSCRIT';
export const MONTANT_FRAIS_INSCRIPTION = 200;

export function isActiviteInscription(activite) {
  const prefixe = String(activite?.prefixeIdPaiement || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
  return prefixe === PREFIXE_INSCRIPTION;
}

/** Nouveau compte web non encore activé (les membres déjà en base sont VALIDE). */
export function needsInscriptionPayment(user) {
  if (!user || hasAdminAccess(user)) return false;
  return user.statut === 'EN_ATTENTE';
}

export function postAuthMemberPath(user) {
  return needsInscriptionPayment(user) ? paths.mesCotisations : paths.profil;
}
