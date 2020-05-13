const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
    // logic for transforming into the new state
    await query.removeColumn(
      'project',
      'is_completed',
    );

  },

  down: async (query) => {
    // logic for reverting the changes
    await query.addColumn(
      'project',
      'is_completed',
      {
        type: Sequelize.DataTypes.BOOLEAN,
      }
    );
  }
}
