-- Titre et grade indépendants : titre_id optionnel, role_id = grade.
ALTER TABLE `membres`
  ADD COLUMN `titre_id` int DEFAULT NULL AFTER `role_id`,
  ADD KEY `membres_titre_id_idx` (`titre_id`),
  ADD CONSTRAINT `membres_titre_id_fkey`
    FOREIGN KEY (`titre_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Titres officiels (CG / CDR / CDD / CDP) s'ils manquent encore.
INSERT INTO `roles` (`nom`, `niveau_hierarchique`, `createdAt`, `updatedAt`)
SELECT v.nom, v.niveau, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM (
  SELECT 'Coordinateur Général (CG)' AS nom, 1 AS niveau
  UNION ALL SELECT 'Coordinateur de Région (CDR)', 2
  UNION ALL SELECT 'Coordinateur de District (CDD)', 3
  UNION ALL SELECT 'Coordinateur de Paroisse (CDP)', 4
) v
WHERE NOT EXISTS (SELECT 1 FROM `roles` r WHERE r.nom = v.nom);

-- Les commissaires et grades du mouvement ne sont pas des titres.
UPDATE `roles` SET `niveau_hierarchique` = 5, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Commissaire National (CN)';
UPDATE `roles` SET `niveau_hierarchique` = 6, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Commissaire National Adjoint (CNA)';
UPDATE `roles` SET `niveau_hierarchique` = 7, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Commissaire de Région (CR)';
UPDATE `roles` SET `niveau_hierarchique` = 8, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Commissaire de District (CD)';
UPDATE `roles` SET `niveau_hierarchique` = 9, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Chef de Troupe (CT)';
UPDATE `roles` SET `niveau_hierarchique` = 10, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Chef de Troupe Adjoint (CTA)';
UPDATE `roles` SET `niveau_hierarchique` = 11, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Chef de Patrouille (CP)';
UPDATE `roles` SET `niveau_hierarchique` = 12, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Sous chef de patrouille (SP)';
UPDATE `roles` SET `niveau_hierarchique` = 13, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `nom` = 'Comité de Jeunesse Locale (CLJ)';

-- Anciens rôles de coordination → titre_id ; grade par défaut (SP).
UPDATE `membres` m
INNER JOIN `roles` r ON r.id = m.role_id
INNER JOIN `roles` g ON g.nom = 'Sous chef de patrouille (SP)'
SET m.titre_id = m.role_id,
    m.role_id = g.id
WHERE m.titre_id IS NULL
  AND (
    r.nom LIKE 'Coordinateur%'
    OR r.nom IN (
      'Coordinateur Général (CG)',
      'Coordinateur de Région (CDR)',
      'Coordinateur de District (CDD)',
      'Coordinateur de Paroisse (CDP)',
      'Coordinateur général (C.G.)',
      'Coordinateurs de région (C.D.R.)',
      'Coordinateurs de district (C.D.D.)',
      'Coordinateurs de paroisse (C.D.P.)',
      'Secrétaire général'
    )
  );
