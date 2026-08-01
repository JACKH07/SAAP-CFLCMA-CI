/**
 * Normalise une chaîne pour comparaison insensible à la casse et aux accents.
 * Ex. "Évangélique" → "evangelique"
 */
function normalizeText(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Extrait les 2 premières lettres alphabétiques d'une chaîne (majuscules).
 */
function extractLetters(value, count = 2) {
  const letters = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();

  return letters.padEnd(count, 'X').slice(0, count);
}

/**
 * Formate une date en AAAAMMJJ.
 */
function formatDateCompact(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Date de naissance invalide');
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

module.exports = { normalizeText, extractLetters, formatDateCompact };
