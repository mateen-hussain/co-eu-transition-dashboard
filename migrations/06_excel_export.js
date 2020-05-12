const Sequelize = require('sequelize');
const logger = require('services/logger');

const up = async (query) => {
  await query.addColumn(
    'field_entry_group',
    'order',
    {
      type: Sequelize.DataTypes.INTEGER
    }
  );

  await query.addColumn(
    'field_entry_group',
    'config',
    {
      type: Sequelize.JSON
    }
  );
};

const down = async (query) => {
  try{
    // logic for reverting the changes
    await query.removeColumn(
      'field_entry_group',
      'order'
    );
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try{
    await query.removeColumn(
      'field_entry_group',
      'config'
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