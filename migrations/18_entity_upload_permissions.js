const { services } = require('config');
const logger = require('services/logger');
const Sequelize = require('sequelize');

const up = async (query) => {
  await query.createTable('entity_user', {
    entity_id: {
      type: Sequelize.INTEGER(10),
      references: {
        model: 'entity',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    user_id: {
      type: Sequelize.INTEGER(10).UNSIGNED,
      references: {
        model: 'user',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    }
  }, { charset: services.mysql.charset });

  await query.bulkInsert('category', [{
    name: 'Department',
    public_id_format: `department-`
  }]);
};

const down = async (query) => {
  try {
    await query.dropTable('entity_user');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  await query.bulkDelete('category', { name: 'Department' });
};

module.exports = {
  up: async (query) => {
    try {
      await up(query);
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await down(query);
      throw error;
    }
  },
  down
}
