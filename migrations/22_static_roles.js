const logger = require('services/logger');

const up = async (query) => {
  await query.bulkInsert('role', [
    {
      name: 'static'
    },{
      name: 'skip_2fa'
    }
  ]);
};

const down = async (query) => {
  try {
    await query.sequelize.query("DELETE FROM role WHERE name = 'static'");
    await query.sequelize.query("DELETE FROM role WHERE name = 'skip_2fa'");
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
