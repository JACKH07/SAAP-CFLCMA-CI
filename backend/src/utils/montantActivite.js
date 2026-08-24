const { AppError } = require('./errors');

function montantCible(activite) {
  const value = Number(activite?.montantDefaut);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function restantDu(activite, dejaPaye) {
  const cible = montantCible(activite);
  if (cible == null) return null;
  return Math.max(0, Math.round(cible - Number(dejaPaye || 0)));
}

function assertMontantVersement(activite, dejaPaye, payAmount) {
  const amount = Number(payAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Indiquez un montant valide (FCFA)', 400);
  }

  const restant = restantDu(activite, dejaPaye);
  if (restant == null) return amount;
  if (restant <= 0) {
    throw new AppError('Cette cotisation est déjà soldée', 400);
  }
  if (amount > restant) {
    throw new AppError(
      `Le montant restant à payer est de ${restant.toLocaleString('fr-FR')} FCFA`,
      400
    );
  }
  return amount;
}

module.exports = {
  montantCible,
  restantDu,
  assertMontantVersement,
};
