# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.7.29)
# Database: dashboard
# Generation Time: 2020-02-28 14:46:44 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table projects
# ------------------------------------------------------------

DROP TABLE IF EXISTS `projects`;

CREATE TABLE `projects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `project_name` text,
  `department` text,
  `impact` int(11) DEFAULT NULL,
  `hmg_confidence` int(11) DEFAULT NULL,
  `citizen_readiness` int(11) DEFAULT NULL,
  `business_readiness` int(11) DEFAULT NULL,
  `eu_state_confidence` int(11) DEFAULT NULL,
  `createdAt` date DEFAULT NULL,
  `updatedAt` date DEFAULT NULL,
  `status` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;

INSERT INTO `projects` (`project_name`, `department`, `impact`, `hmg_confidence`, `citizen_readiness`, `business_readiness`, `eu_state_confidence`, `status`)
VALUES
  ('GB-SEM BEIS Electricity trading and operation of SEM','BEIS',0,0,0,0,0, 'Project complete'),
  ('Animal and Plant Health - Imports of Animal and Animal Products (Initial)','DEFRA',0,1,0,2,3, 'Project complete'),
  ('Government secured freight capacity','DFT',0,1,1,1,1, NULL),
  ('Trade Remedies','DIT',0,1,1,1,1, 'Project complete'),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',1,1,0,0,0, NULL),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',0,2,0,3,0, NULL),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',1,0,1,0,0, NULL),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',1,0,0,2,0, NULL),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',0,2,2,0,0, NULL),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',0,0,1,1,1, NULL),
  ('GB-SEM Electricity trading and operation of SEM','BEIS',0,1,2,3,0, NULL);

/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table milestones
# ------------------------------------------------------------

DROP TABLE IF EXISTS `milestones`;

CREATE TABLE `milestones` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `milestone_uid` text,
  `description` text,
  `due_date` date DEFAULT NULL,
  `last_comment` text,
  `projectId` int(11) DEFAULT NULL,
  `createdAt` date DEFAULT NULL,
  `updatedAt` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `milestones` WRITE;
/*!40000 ALTER TABLE `milestones` DISABLE KEYS */;

INSERT INTO `milestones` (`milestone_uid`, `description`, `due_date`, `last_comment`, `projectId`)
VALUES
  ('BEIS-37-M01','BEIS to publish government response to consultation on Future of UK carbon pricing to set out what carbon pricing policy framework the UK intends to implement to help achieve our carbon emissions reduction targets','2019-01-31','Latest comment about the status of this milestone and the activities that have been completed should go in this text area.',1),
  ('BEIS-37-M02','BEIS to publish government response to consultation on Future of UK carbon pricing to set out what carbon pricing policy framework the UK intends to implement to help achieve our carbon emissions reduction targets','2019-02-28','Latest comment about the status of this milestone and the activities that have been completed should go in this text area.',1),
  ('DEFRA-02-M01','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2020-02-21','Lorem ipsum dolor sit amet, consectetur adipiscing elit',1),
  ('DEFRA-02-M02','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-02-22','Lorem ipsum dolor sit amet, consectetur adipiscing elit',1),
  ('DEFRA-02-M03','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-03-02','Lorem ipsum dolor sit amet, consectetur adipiscing elit',2),
  ('DFT-37-M01','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-05-10','Lorem ipsum dolor sit amet, consectetur adipiscing elit',2),
  ('DFT-37-M01','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-05-14','Lorem ipsum dolor sit amet, consectetur adipiscing elit',2),
  ('DIT-37-M01','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-06-1','Lorem ipsum dolor sit amet, consectetur adipiscing elit',3),
  ('BEIS-37-M01','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-06-5','Lorem ipsum dolor sit amet, consectetur adipiscing elit',4),
  ('BEIS-37-M01','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.','2019-05-17','Lorem ipsum dolor sit amet, consectetur adipiscing elit',5);

/*!40000 ALTER TABLE `milestones` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
