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
