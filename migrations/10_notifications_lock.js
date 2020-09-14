const { services } = require('config');
const logger = require('services/logger');
const Sequelize = require('sequelize');
const config = require('config');

const up = async (query) => {
  await query.createTable('dashboard_locks', {
    guid: Sequelize.DataTypes.STRING(50),
    name: Sequelize.DataTypes.STRING(50)
  }, { charset: services.mysql.charset });

  query.bulkInsert('dashboard_locks', [{
    name: config.locks.upcomingMilestonesNotifications
  }]);
};

const down = async (query) => {
  try {
    await query.dropTable('dashboard_locks');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }
};

module.exports = {
  up: async (query) => {
    try {
      await up(query);
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await down(query);
      throw error;
    }
  },
  down
}