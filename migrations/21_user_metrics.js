const { services } = require('config');
const logger = require('services/logger');
const Sequelize = require('sequelize');

const up = async (query) => {
  await query.createTable('user_metric', {
    metric_id: {
      type: Sequelize.DataTypes.STRING(50),
      allowNull: false,
    },
    user_id: {
      type: Sequelize.DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    }
  }, { charset: services.mysql.charset });

  await query.addConstraint('user_metric', ['user_id', 'metric_id'], {
    type: 'primary key',
    name: 'pk_user_metric'
  });

};

const down = async (query) => {
  try {
    await query.dropTable('user_metric');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }
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
