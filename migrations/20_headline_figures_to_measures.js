const logger = require('services/logger');

const up = async (query) => {
  await query.sequelize.query("ALTER TABLE headline_figures RENAME TO headline_measures;");
};

const down = async (query) => {
  await query.sequelize.query("ALTER TABLE headline_measures RENAME TO headline_figures;");
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