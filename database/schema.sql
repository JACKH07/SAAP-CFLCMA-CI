
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `activites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefixe_id_paiement` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `montant_defaut` decimal(12,2) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `activites_nom_key` (`nom`),
  UNIQUE KEY `activites_prefixe_id_paiement_key` (`prefixe_id_paiement`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `acteur_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entite` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entite_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_acteur_id_idx` (`acteur_id`),
  KEY `audit_logs_entite_entite_id_idx` (`entite`,`entite_id`),
  KEY `audit_logs_createdAt_idx` (`createdAt`),
  CONSTRAINT `audit_logs_acteur_id_fkey` FOREIGN KEY (`acteur_id`) REFERENCES `membres` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `communautes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `communautes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_normalise` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paroisse_id` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `communautes_paroisse_id_nom_normalise_key` (`paroisse_id`,`nom_normalise`),
  KEY `communautes_nom_normalise_idx` (`nom_normalise`),
  KEY `communautes_paroisse_id_idx` (`paroisse_id`),
  CONSTRAINT `communautes_paroisse_id_fkey` FOREIGN KEY (`paroisse_id`) REFERENCES `paroisses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cotisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotisations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `membre_id` int NOT NULL,
  `activite_id` int NOT NULL,
  `id_paiement` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `montant` decimal(12,2) NOT NULL,
  `montant_paye` decimal(12,2) NOT NULL DEFAULT '0.00',
  `date_paiement` datetime(3) DEFAULT NULL,
  `statut` enum('EN_ATTENTE','PARTIEL','PAYE','ECHOUE','ANNULE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EN_ATTENTE',
  `mode_paiement` enum('MOBILE_MONEY','MANUEL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `paroisse_id` int DEFAULT NULL,
  `communaute_id` int DEFAULT NULL,
  `saisi_par_id` int DEFAULT NULL,
  `justificatif_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_externe` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cotisations_id_paiement_key` (`id_paiement`),
  UNIQUE KEY `cotisations_membre_id_activite_id_key` (`membre_id`,`activite_id`),
  KEY `cotisations_activite_id_idx` (`activite_id`),
  KEY `cotisations_statut_idx` (`statut`),
  KEY `cotisations_region_id_idx` (`region_id`),
  KEY `cotisations_district_id_fkey` (`district_id`),
  KEY `cotisations_paroisse_id_fkey` (`paroisse_id`),
  KEY `cotisations_communaute_id_fkey` (`communaute_id`),
  CONSTRAINT `cotisations_activite_id_fkey` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cotisations_communaute_id_fkey` FOREIGN KEY (`communaute_id`) REFERENCES `communautes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cotisations_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cotisations_membre_id_fkey` FOREIGN KEY (`membre_id`) REFERENCES `membres` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cotisations_paroisse_id_fkey` FOREIGN KEY (`paroisse_id`) REFERENCES `paroisses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cotisations_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `districts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `districts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region_id` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `districts_region_id_idx` (`region_id`),
  CONSTRAINT `districts_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `historique_mandats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historique_mandats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `membre_id` int NOT NULL,
  `role_id` int NOT NULL,
  `region_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `paroisse_id` int DEFAULT NULL,
  `communaute_id` int DEFAULT NULL,
  `date_debut` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `date_fin` datetime(3) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `historique_mandats_membre_id_idx` (`membre_id`),
  CONSTRAINT `historique_mandats_membre_id_fkey` FOREIGN KEY (`membre_id`) REFERENCES `membres` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `membres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membres` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_naissance` date NOT NULL,
  `lieu_naissance` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branche` enum('FLAMBEAUX','LUMIERES') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `situation_matrimoniale` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profession` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsabilite_bureau` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_membre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `region_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `paroisse_id` int DEFAULT NULL,
  `communaute_id` int DEFAULT NULL,
  `mandate_par` int DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `statut` enum('EN_ATTENTE','VALIDE','REJETE','SUSPENDU') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EN_ATTENTE',
  `collision_suffix` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `membres_id_membre_key` (`id_membre`),
  UNIQUE KEY `membres_email_key` (`email`),
  KEY `membres_role_id_idx` (`role_id`),
  KEY `membres_region_id_idx` (`region_id`),
  KEY `membres_district_id_idx` (`district_id`),
  KEY `membres_paroisse_id_idx` (`paroisse_id`),
  KEY `membres_communaute_id_idx` (`communaute_id`),
  KEY `membres_mandate_par_fkey` (`mandate_par`),
  CONSTRAINT `membres_communaute_id_fkey` FOREIGN KEY (`communaute_id`) REFERENCES `communautes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `membres_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `membres_mandate_par_fkey` FOREIGN KEY (`mandate_par`) REFERENCES `membres` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `membres_paroisse_id_fkey` FOREIGN KEY (`paroisse_id`) REFERENCES `paroisses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `membres_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `membres_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `paroisses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paroisses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_normalise` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district_id` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `paroisses_district_id_nom_normalise_key` (`district_id`,`nom_normalise`),
  KEY `paroisses_nom_normalise_idx` (`nom_normalise`),
  KEY `paroisses_district_id_idx` (`district_id`),
  CONSTRAINT `paroisses_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `regions_code_key` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `niveau_hierarchique` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_nom_key` (`nom`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

