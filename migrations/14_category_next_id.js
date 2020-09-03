const Sequelize = require('sequelize')
const logger = require('services/logger');

const up = async (query) => {
  await query.addColumn(
    'category',
    'current_max_id',
    {
      type: Sequelize.DataTypes.INTEGER,
      defaultValue: 0
    }
  );
};

const down = async (query) => {
  await query.removeColumn(
    'category',
    'current_max_id',
  );
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
