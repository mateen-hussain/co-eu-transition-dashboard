const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
    await query.createTable('temporary_bulk_import_store', {
      id: {
        type: Sequelize.STRING(40),
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // logic for transforming into the new state
    await query.addColumn(
      'milestone_field',
      'mi_template_column_name',
      {
        type: Sequelize.DataTypes.STRING(255)
      }
    );

    await query.addColumn(
      'project_field',
      'mi_template_column_name',
      {
        type: Sequelize.DataTypes.STRING(255)
      }
    );

  },

  down: async (query) => {
    await query.removeTable('temporary_bulk_import_store');

    // logic for reverting the changes
    await query.removeColumn(
      'milestone_field',
      'mi_template_column_name'
    );

    // logic for reverting the changes
    await query.removeColumn(
      'project_field',
      'mi_template_column_name'
    );
  }
}