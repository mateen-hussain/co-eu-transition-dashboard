const Sequelize = require('sequelize');
const logger = require('services/logger');
const { services } = require('config');

const up = async (query, transaction) => {
  await query.createTable('field_entry_group',
    {
      name: {
        type: Sequelize.DataTypes.STRING(50),
        primaryKey: true
      }
    },
    { transaction, charset: services.mysql.charset }
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
  ], { transaction });

  await query.addColumn(
    'project_field',
    'group',
    {
      type: Sequelize.DataTypes.STRING(50)
    },
    { transaction }
  );

  await query.addConstraint('project_field', ['group'], {
    type: 'FOREIGN KEY',
    name: 'fk_project_field_group',
    references: {
      table: 'field_entry_group',
      field: 'name',
    },
    onDelete: 'no action',
    onUpdate: 'no action',
    transaction
  });

  await query.addColumn(
    'project_field',
    'order',
    {
      type: Sequelize.DataTypes.INTEGER(10)
    },
    { transaction }
  );

  await query.addColumn(
    'milestone_field',
    'order',
    {
      type: Sequelize.DataTypes.INTEGER(10)
    },
    { transaction }
  );
};

const down = async (query) => {
  try{
    await query.removeConstraint('project_field', 'fk_project_field_group');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try{
    await query.dropTable('field_entry_group');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  // logic for reverting the changes
  try{
    await query.removeColumn(
      'project_field',
      'group'
    );
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try{
    await query.removeColumn(
      'project_field',
      'order'
    );
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try{
    await query.removeColumn(
      'milestone_field',
      'order'
    );
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }
};

module.exports = {
  up: async (query) => {
    const transaction = await query.sequelize.transaction();

    try {
      await up(query, transaction);
      await transaction.commit();
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await transaction.rollback();
      await down(query);
      throw error;
    }
  },
  down
}