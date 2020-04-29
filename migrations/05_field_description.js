const Sequelize = require('sequelize');
const logger = require('services/logger');

const up = async (query) => {
  await query.addColumn(
    'project_field',
    'description',
    {
      type: Sequelize.DataTypes.TEXT
    }
  );

  await query.addColumn(
    'milestone_field',
    'description',
    {
      type: Sequelize.DataTypes.TEXT
    }
  );
};

const down = async (query) => {
  try{
    // logic for reverting the changes
    await query.removeColumn(
      'project_field',
      'description'
    );
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try{
    await query.removeColumn(
      'milestone_field',
      'description'
    );
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