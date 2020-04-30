const Sequelize = require('sequelize');
const { services } = require('config');

module.exports = {
  up: async (query) => {
    await query.createTable('bulk_import', {
      id: {
        type: Sequelize.STRING(40),
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER(10).UNSIGNED,
        allowNull: false
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    }, { charset: services.mysql.charset });

    await query.addConstraint('bulk_import', ['user_id'], {
      type: 'FOREIGN KEY',
      name: 'fk_bulk_import_user',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'no action',
      onUpdate: 'no action'
    });

    await query.addColumn(
      'milestone_field',
      'import_column_name',
      {
        type: Sequelize.DataTypes.STRING(255),
        unique: true
      }
    );

    await query.addColumn(
      'project_field',
      'import_column_name',
      {
        type: Sequelize.DataTypes.STRING(255),
        unique: true
      }
    );
  },

  down: async (query) => {
    await query.removeTable('bulk_import');

    // logic for reverting the changes
    await query.removeColumn(
      'milestone_field',
      'import_column_name'
    );

    // logic for reverting the changes
    await query.removeColumn(
      'project_field',
      'import_column_name'
    );
  }
}