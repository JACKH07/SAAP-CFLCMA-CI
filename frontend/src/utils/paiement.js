export function moyenPaiement(versement) {
  const provider = String(versement?.provider || '').toUpperCase();
  if (provider === 'ORANGE') return 'Orange Money';
  if (provider === 'WAVE') return 'Wave';
  if (String(versement?.modePaiement || '').toUpperCase() === 'MANUEL') return 'Manuel';
  return versement?.provider || 'Paiement';
}

export function formatDateHeure(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function totalVersements(cotisation) {
  const lignes = cotisation?.versements || [];
  if (lignes.length) {
    return lignes.reduce((sum, ligne) => sum + Number(ligne.montant || 0), 0);
  }
  return Number(cotisation?.montantPaye || 0);
}

export function montantCible(activite) {
  const value = Number(activite?.montantDefaut);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function restantDu(activite, dejaPaye) {
  const cible = montantCible(activite);
  if (cible == null) return null;
  return Math.max(0, Math.round(cible - Number(dejaPaye || 0)));
}

export function statutCotisation(cotisation, activite) {
  const paye = totalVersements(cotisation);
  const cible = montantCible(activite);
  if (cible != null) {
    if (paye <= 0) return 'EN_ATTENTE';
    if (paye >= cible) return 'PAYE';
    return 'PARTIEL';
  }
  return cotisation?.statut || 'EN_ATTENTE';
}
