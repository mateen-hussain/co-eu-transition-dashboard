const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
    // logic for transforming into the new state
    await query.addColumn(
      'user',
      'login_attempts',
      {
        type: Sequelize.DataTypes.INTEGER,
        defaultValue: 0
      }
    );

  },

  down: async (query) => {
    // logic for reverting the changes
    await query.removeColumn(
      'user',
      'login_attempts'
    );
  }
}