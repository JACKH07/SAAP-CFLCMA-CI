const { extractLetters, formatDateCompact, normalizeText } = require('../../utils/text');

// Tests unitaires purs (sans DB) pour membreIdService.buildBaseId logic
describe('text utils', () => {
  test('extractLetters gère accents et caractères spéciaux', () => {
    expect(extractLetters('Kouassi', 2)).toBe('KO');
    expect(extractLetters('Jean-Baptiste', 2)).toBe('JE');
    expect(extractLetters('Élodie', 2)).toBe('EL');
    expect(extractLetters('A', 2)).toBe('AX');
  });

  test('formatDateCompact', () => {
    expect(formatDateCompact(new Date(Date.UTC(1995, 2, 12)))).toBe('19950312');
  });

  test('normalizeText ignore casse et accents', () => {
    expect(normalizeText('Évangélique')).toBe('evangelique');
    expect(normalizeText('  Saint  Paul  ')).toBe('saint paul');
  });
});

describe('membreId base generation', () => {
  const { extractLetters: el, formatDateCompact: fd } = require('../../utils/text');

  function buildBaseId(nom, prenom, dateNaissance) {
    return `${el(nom, 2)}${el(prenom, 2)}${fd(dateNaissance)}`;
  }

  test('exemple KOJA19950312', () => {
    expect(buildBaseId('Koffi', 'Jacques', new Date(Date.UTC(1995, 2, 12)))).toBe(
      'KOJA19950312'
    );
  });

  test('buildPaymentId format', () => {
    const prefixe = 'EYAWA';
    const id = 'KOJA19950312';
    expect(`${prefixe}-${id}`).toBe('EYAWA-KOJA19950312');
  });
});
