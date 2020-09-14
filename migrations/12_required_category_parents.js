const Sequelize = require('sequelize')
const logger = require('services/logger');

const up = async (query) => {
  await query.addColumn(
    'category_parent',
    'is_required',
    {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: true
    }
  );
};

const down = async (query) => {
  await query.removeColumn(
    'category_parent',
    'is_required',
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
