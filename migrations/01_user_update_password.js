const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
    // logic for transforming into the new state
    await query.addColumn(
      'user',
      'password_reset',
      {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: 1
      }
    );

  },

  down: async (query) => {
    // logic for reverting the changes
    await query.removeColumn(
      'user',
      'password_reset'
    );
  }
}