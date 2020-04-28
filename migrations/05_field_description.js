const Sequelize = require('sequelize');
const logger = require('services/logger');

module.exports = {
  up: async (query) => {
    try{
      // logic for transforming into the new state
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
    } catch (error) {
      logger.error(error);
    }
  },

  down: async (query) => {
    // logic for reverting the changes
    await query.removeColumn(
      'project_field',
      'description'
    );

    await query.removeColumn(
      'milestone_field',
      'description'
    );
  }
}