const Sequelize = require('sequelize')

module.exports = {
  up: async (query) => {
    await query.createTable('field_entry_group',
      {
        name: {
          type: Sequelize.DataTypes.STRING(50),
          primaryKey: true
        }
      }
    );

    await query.bulkInsert('field_entry_group', [
      {
        name: "Department and Project Information"
      },{
        name: "Current Delivery status"
      },{
        name: "HMG Delivery"
      },{
        name: "Third Party Readiness"
      },{
        name: "Variance from Negotiated Outcomes"
      }
    ]);

    await query.addColumn(
      'project_field',
      'group',
      {
        type: Sequelize.DataTypes.STRING(50)
      }
    );

    await query.addConstraint('project_field', ['group'], {
      type: 'FOREIGN KEY',
      name: 'fk_project_field_group',
      references: {
        table: 'field_entry_group',
        field: 'name',
      },
      onDelete: 'no action',
      onUpdate: 'no action'
    });

    await query.addColumn(
      'project_field',
      'order',
      {
        type: Sequelize.DataTypes.INTEGER(10)
      }
    );

    await query.addColumn(
      'milestone_field',
      'order',
      {
        type: Sequelize.DataTypes.INTEGER(10)
      }
    );

  },

  down: async (query) => {
    await query.removeTable('field_entry_group');

    // logic for reverting the changes
    await query.removeColumn(
      'project_field',
      'group'
    );

    await query.removeColumn(
      'project_field',
      'order'
    );

    await query.removeColumn(
      'milestone_field',
      'order'
    );
  }
}