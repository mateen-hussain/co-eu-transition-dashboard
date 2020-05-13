const Sequelize = require('sequelize')

const up = async (query) => {
  await query.removeColumn(
    'project',
    'is_completed',
  );
};

const down = async (query) => {
  await query.addColumn(
    'project',
    'is_completed',
    {
      type: Sequelize.DataTypes.BOOLEAN,
    }
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
