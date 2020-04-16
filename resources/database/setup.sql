# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.7.29)
# Database: co_transition_dashboard
# Generation Time: 2020-03-11 12:15:56 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table department
# ------------------------------------------------------------

DROP TABLE IF EXISTS `department`;

CREATE TABLE `department` (
  `name` varchar(10) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;

INSERT INTO `department` (`name`)
VALUES
  ('DFT'),
  ('DIT'),
  ('BEIS');

/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table department_user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `department_user`;

CREATE TABLE `department_user` (
  `department_name` varchar(10) NOT NULL,
  `user_id` int(11) NOT NULL,
  KEY `fk_department_user_department` (`department_name`),
  KEY `fk_department_user_user_idx` (`user_id`),
  CONSTRAINT `fk_department_user_department` FOREIGN KEY (`department_name`) REFERENCES `department` (`name`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `department_user` WRITE;
/*!40000 ALTER TABLE `department_user` DISABLE KEYS */;

INSERT INTO `department_user` (`department_name`, `user_id`)
VALUES
  ('DIT',1),
  ('DFT',2),
  ('BEIS',3),
  ('DIT',4),
  ('DFT',4),
  ('BEIS',4),
  ('DIT',5),
  ('DFT',5),
  ('BEIS',5);

/*!40000 ALTER TABLE `department_user` ENABLE KEYS */;
UNLOCK TABLES;




# Dump of table project
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project`;

CREATE TABLE `project` (
  `uid` varchar(32) NOT NULL,
  `department_name` varchar(10) NOT NULL,
  `title` varchar(1024) DEFAULT NULL,
  `impact` int(10) unsigned DEFAULT NULL,
  `sro` varchar(256) DEFAULT NULL,
  `description` text,
  `created_at` date DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  PRIMARY KEY (`uid`),
  KEY `fk_project_department_idx` (`department_name`),
  CONSTRAINT `fk_project_department` FOREIGN KEY (`department_name`) REFERENCES `department` (`name`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `project` WRITE;
/*!40000 ALTER TABLE `project` DISABLE KEYS */;

INSERT INTO `project` (`uid`, `department_name`, `title`, `impact`, `sro`, `description`, `created_at`, `updated_at`)
VALUES
  ('Project 1','BEIS','Project 1 title',1,'SRO','description',NULL,NULL),
  ('Project 2','BEIS','Project 2 title',1,'SRO','description',NULL,NULL),
  ('Project 3','DFT','Project 3 title',1,'SRO','description',NULL,NULL),
  ('Project 4','DFT','Project 4 title',1,'SRO','description',NULL,NULL),
  ('Project 5','DFT','Project 5 title',1,'SRO','description',NULL,NULL),
  ('Project 6','DIT','Project 6 title',1,'SRO','description',NULL,NULL),
  ('Project 7','DIT','Project 7 title',1,'SRO','description',NULL,NULL),
  ('Project 8','DIT','Project 8 title',1,'SRO','description',NULL,NULL),
  ('Project 9','BEIS','Project 9 title',1,'SRO','description',NULL,NULL),
  ('Project 10','BEIS','Project 10 title',1,'SRO','description',NULL,NULL);

/*!40000 ALTER TABLE `project` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table project_field
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_field`;

CREATE TABLE `project_field` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `type` enum('string','boolean','integer','float','group','date') DEFAULT NULL,
  `config` JSON NULL,
  `is_active` tinyint(4) DEFAULT NULL,
  `is_required` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `project_field` WRITE;
/*!40000 ALTER TABLE `project_field` DISABLE KEYS */;

INSERT INTO `project_field` (`id`, `name`, `display_name`, `type`, `is_active`, `is_required`)
VALUES
  (1,'hmgConfidence','HMG Confidence','integer',1,NULL),
  (2,'citizenReadiness','Citizen Readiness','integer',1,NULL),
  (3,'businessReadiness','Business Readiness','integer',1,NULL),
  (4,'euStateConfidence','EU Member State Delivery Confidence','integer',1,NULL),
  (6,'solution','Solution','string',1,NULL),
  (7,'progressStatus','Progress status','string',1,NULL),
  (8,'deliveryBarriers','Delivery Barriers','string',1,NULL),
  (9,'deliveryBarriersRationale','Delivery Barriers Rationale','string',1,NULL),
  (10,'beginDelivery','Begin Delivery','date',1,NULL),
  (11,'withdrawalAgreement','Withdrawal Agreement','string',1,NULL),
  (12,'withdrawalAgreementDetails','Withdrawal Agreement - Details','string',1,NULL),
  (13,'citizenAction','Citizen action','string',1,NULL),
  (14,'businessAction','Business action','string',1,NULL),
  (16,'euStatesAction','EU States action','string',1,NULL),
  (17,'possibleNegotiationOutcomes','Possible negotiation outcomes','string',1,NULL),
  (18,'baselineDeliveryChange','Baseline delivery change','string',1,NULL),
  (19,'baselineDeliveryChangeImpact','Baseline delivery change impact','integer',1,NULL),
  (20,'changeInImpact','Change in impact','integer',1,NULL),
  (21,'changeStartDate','Change in latest start date','date',1,NULL),
  (22,'deliveryTheme','Delivery Theme','string',1,NULL),
  (24,'hmgDeliveryConfidenceRationale','HMG Delivery Confidence Ration','string',1,NULL);

/*!40000 ALTER TABLE `project_field` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table project_field_entry
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_field_entry`;

CREATE TABLE `project_field_entry` (
  `project_field_id` int(10) unsigned NOT NULL,
  `project_uid` varchar(32) NOT NULL,
  `value` blob,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_uid`,`project_field_id`),
  KEY `fk_project_field_entry_project_field_idx` (`project_field_id`),
  CONSTRAINT `fk_project_field_entry_milestone` FOREIGN KEY (`project_uid`) REFERENCES `project` (`uid`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_project_field_entry_milestone_field` FOREIGN KEY (`project_field_id`) REFERENCES `project_field` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `project_field_entry` (`project_field_id`, `project_uid`, `value`, `created_at`, `updated_at`)
VALUES
  (1,'Project 1',"1",NULL,NULL),
  (2,'Project 1',X'31',NULL,NULL),
  (3,'Project 1',X'31',NULL,NULL),
  (4,'Project 1',X'30',NULL,NULL),
  (1,'Project 2',X'33',NULL,NULL),
  (2,'Project 2',X'32',NULL,NULL),
  (3,'Project 2',X'30',NULL,NULL),
  (4,'Project 2',X'30',NULL,NULL),
  (1,'Project 3',X'32',NULL,NULL),
  (2,'Project 3',X'31',NULL,NULL),
  (3,'Project 3',X'33',NULL,NULL),
  (4,'Project 3',X'32',NULL,NULL),
  (1,'Project 4',X'30',NULL,NULL),
  (2,'Project 4',X'31',NULL,NULL),
  (3,'Project 4',X'31',NULL,NULL),
  (4,'Project 4',X'31',NULL,NULL),
  (1,'Project 5',X'31',NULL,NULL),
  (2,'Project 5',X'32',NULL,NULL),
  (3,'Project 5',X'32',NULL,NULL),
  (4,'Project 5',X'32',NULL,NULL),
  (1,'Project 6',X'32',NULL,NULL),
  (2,'Project 6',X'33',NULL,NULL),
  (3,'Project 6',X'33',NULL,NULL),
  (4,'Project 6',X'33',NULL,NULL),
  (1,'Project 7',X'33',NULL,NULL),
  (2,'Project 7',X'30',NULL,NULL),
  (3,'Project 7',X'30',NULL,NULL),
  (4,'Project 7',X'30',NULL,NULL),
  (1,'Project 8',X'30',NULL,NULL),
  (2,'Project 8',X'30',NULL,NULL),
  (3,'Project 8',X'31',NULL,NULL),
  (4,'Project 8',X'31',NULL,NULL),
  (1,'Project 9',X'31',NULL,NULL),
  (2,'Project 9',X'33',NULL,NULL),
  (3,'Project 9',X'31',NULL,NULL),
  (4,'Project 9',X'32',NULL,NULL),
  (1,'Project 10',X'31',NULL,NULL),
  (2,'Project 10',X'33',NULL,NULL),
  (3,'Project 10',X'32',NULL,NULL),
  (4,'Project 10',X'30',NULL,NULL);

/*!40000 ALTER TABLE `project_field_entry` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table project_field_entry_audit
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_field_entry_audit`;

CREATE TABLE `project_field_entry_audit` (
  `project_field_id` int(10) unsigned NOT NULL,
  `project_uid` varchar(32) NOT NULL,
  `value` blob,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_project_field_entry_audit_project_field_entry_idx` (`project_field_id`,`project_uid`),
  CONSTRAINT `fk_project_field_entry_audit_project_field_entry` FOREIGN KEY (`project_field_id`, `project_uid`) REFERENCES `project_field_entry` (`project_field_id`, `project_uid`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table project_rag_rating
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_rag_rating`;

CREATE TABLE `project_rag_rating` (
  `rag_rating` varchar(32) NOT NULL,
  PRIMARY KEY (`rag_rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table project_reprofiling_category
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_reprofiling_category`;

CREATE TABLE `project_reprofiling_category` (
  `reprofiling_category` varchar(128) NOT NULL,
  PRIMARY KEY (`reprofiling_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

# Dump of table milestone
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone`;

CREATE TABLE `milestone` (
  `uid` varchar(32) NOT NULL,
  `project_uid` varchar(32) NOT NULL,
  `description` text,
  `date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uid`),
  KEY `fk_milestone_project_idx` (`project_uid`),
  CONSTRAINT `fk_milestone_project` FOREIGN KEY (`project_uid`) REFERENCES `project` (`uid`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `milestone` WRITE;
/*!40000 ALTER TABLE `milestone` DISABLE KEYS */;

INSERT INTO `milestone` (`uid`, `project_uid`, `description`, `date`, `created_at`, `updated_at`)
VALUES
  ('Milestone 1','Project 1','description','2020-01-22',NULL,NULL),
  ('Milestone 12','Project 1','description','2020-01-22',NULL,NULL),
  ('Milestone 2','Project 2','description','2020-02-22',NULL,NULL),
  ('Milestone 3','Project 3','description','2020-03-22',NULL,NULL),
  ('Milestone 4','Project 4','description','2020-04-22',NULL,NULL),
  ('Milestone 5','Project 5','description','2020-05-22',NULL,NULL),
  ('Milestone 6','Project 6','description','2020-06-22',NULL,NULL),
  ('Milestone 7','Project 7','description','2020-07-22',NULL,NULL),
  ('Milestone 8','Project 8','description','2020-08-22',NULL,NULL),
  ('Milestone 9','Project 9','description','2020-09-22',NULL,NULL),
  ('Milestone 11','Project 10','description','2020-10-22',NULL,NULL);

/*!40000 ALTER TABLE `milestone` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table milestone_category
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_category`;

CREATE TABLE `milestone_category` (
  `category` varchar(32) NOT NULL,
  PRIMARY KEY (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table milestone_complete
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_complete`;

CREATE TABLE `milestone_complete` (
  `complete` varchar(32) NOT NULL,
  PRIMARY KEY (`complete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table milestone_department
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_department`;

CREATE TABLE `milestone_department` (
  `department_name` varchar(10) NOT NULL,
  `milestone_uid` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`department_name`),
  KEY `milestone_department_milestone_idx` (`milestone_uid`),
  CONSTRAINT `milestone_department_department` FOREIGN KEY (`department_name`) REFERENCES `department` (`name`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `milestone_department_milestone` FOREIGN KEY (`milestone_uid`) REFERENCES `milestone` (`uid`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table milestone_field
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_field`;

CREATE TABLE `milestone_field` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `type` enum('string','boolean','integer','float','group','date') DEFAULT NULL,
  `config` JSON NULL,
  `is_active` tinyint(4) DEFAULT NULL,
  `is_required` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `milestone_field` (`id`, `name`, `display_name`, `type`, `is_active`, `is_required`)
VALUES
  (1,'deliveryDate','Delivery Date','date',1,NULL),
  (2,'complete','Complete','boolean',1,NULL),
  (3,'deliveryConfidence','Delivery Confidence','integer',1,NULL),
  (4,'category','Category','string',1,NULL),
  (5,'reprofiledReason','Reprofiled Reason','string',1,NULL),
  (6,'comments','Comments','string',1,NULL);



# Dump of table milestone_field_entry
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_field_entry`;

CREATE TABLE `milestone_field_entry` (
  `milestone_field_id` int(10) unsigned NOT NULL,
  `milestone_uid` varchar(32) NOT NULL,
  `value` blob,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_uid`,`milestone_field_id`),
  KEY `fk_milestone_field_entry_milestone_field_idx` (`milestone_field_id`),
  CONSTRAINT `fk_milestone_field_entry_milestone` FOREIGN KEY (`milestone_uid`) REFERENCES `milestone` (`uid`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_milestone_field_entry_milestone_field` FOREIGN KEY (`milestone_field_id`) REFERENCES `milestone_field` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table milestone_field_entry_audit
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_field_entry_audit`;

CREATE TABLE `milestone_field_entry_audit` (
  `milestone_field_id` int(10) unsigned NOT NULL,
  `milestone_uid` varchar(32) NOT NULL,
  `value` blob,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table milestone_readiness
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_readiness`;

CREATE TABLE `milestone_readiness` (
  `readiness` varchar(32) NOT NULL,
  PRIMARY KEY (`readiness`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table milestone_type
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestone_type`;

CREATE TABLE `milestone_type` (
  `type` varchar(32) NOT NULL,
  PRIMARY KEY (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table toolbox_user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `toolbox_user`;

CREATE TABLE `toolbox_user` (
  `user_id` int(11) NOT NULL,
  `can_publish` tinyint(4) DEFAULT '0',
  `can_admin` tinyint(4) DEFAULT '0',
  `created_by` varchar(64) DEFAULT NULL,
  `updated_by` varchar(64) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(64) NOT NULL,
  `last_login_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `hashed_passphrase` varchar(128) DEFAULT NULL,
  `role` varchar(64) DEFAULT NULL,
  `twofa_secret` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;

INSERT INTO `user` (`id`, `email`, `hashed_passphrase`, `role`)
VALUES
  (1,'dit_user','$2a$10$k.4z/V9N1nQQKVQ/92m/xO16dl82R1OsEA.5o5DJADfLBi0wLPbv.','user'),
  (2,'dft_user','$2a$10$k.4z/V9N1nQQKVQ/92m/xO16dl82R1OsEA.5o5DJADfLBi0wLPbv.','user'),
  (3,'beis_user','$2a$10$k.4z/V9N1nQQKVQ/92m/xO16dl82R1OsEA.5o5DJADfLBi0wLPbv.','user'),
  (4,'user','$2a$10$k.4z/V9N1nQQKVQ/92m/xO16dl82R1OsEA.5o5DJADfLBi0wLPbv.','user'),
  (5,'admin','$2a$10$k.4z/V9N1nQQKVQ/92m/xO16dl82R1OsEA.5o5DJADfLBi0wLPbv.','admin');

/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table user_actions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user_actions`;

CREATE TABLE `user_actions` (
  `user_id` int(11) NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_department_user_user_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
