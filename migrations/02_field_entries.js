const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
    // logic for transforming into the new state
    await query.addColumn(
      'project_field_entry',
      'value2',
      {
        type: Sequelize.DataTypes.TEXT('medium'),
        allowNull: false
      }
    );
    await query.sequelize.query("UPDATE project_field_entry SET value2=CONVERT(value using utf8mb4)");
    await query.removeColumn(
      'project_field_entry',
      'value',
    );
    await query.renameColumn(
      'project_field_entry',
      'value2',
      'value',
    );

    await query.addColumn(
      'milestone_field_entry',
      'value2',
      {
        type: Sequelize.DataTypes.TEXT('medium'),
        allowNull: false
      }
    );
    await query.sequelize.query("UPDATE milestone_field_entry SET value2=CONVERT(value using utf8mb4)");
    await query.removeColumn(
      'milestone_field_entry',
      'value',
    );
    await query.renameColumn(
      'milestone_field_entry',
      'value2',
      'value',
    );
  },

  down: async (query) => {
    // logic for reverting the changes
    await query.addColumn(
      'milestone_field_entry',
      'value2',
      {
        type: Sequelize.DataTypes.BLOB,
        allowNull: false
      }
    );
    await query.sequelize.query("UPDATE milestone_field_entry SET value2=CONVERT(value using utf8mb4)");
    await query.removeColumn(
      'milestone_field_entry',
      'value',
    );
    await query.renameColumn(
      'milestone_field_entry',
      'value2',
      'value',
    );

    await query.addColumn(
      'project_field_entry',
      'value2',
      {
        type: Sequelize.DataTypes.BLOB,
        allowNull: false
      }
    );
    await query.sequelize.query("UPDATE project_field_entry SET value2=CONVERT(value using utf8mb4)");
    await query.removeColumn(
      'project_field_entry',
      'value',
    );
    await query.renameColumn(
      'project_field_entry',
      'value2',
      'value',
    );
  }
}
