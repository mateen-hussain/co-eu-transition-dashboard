const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
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
    )
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