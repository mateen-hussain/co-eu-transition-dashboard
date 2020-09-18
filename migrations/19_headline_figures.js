const { services } = require('config');
const logger = require('services/logger');
const Sequelize = require('sequelize');

const up = async (query) => {
  await query.sequelize.query("ALTER TABLE entity ADD UNIQUE (public_id);");

  await query.createTable('headline_figures', {
    enttiy_public_id: {
      type: Sequelize.DataTypes.STRING(50),
      references: {
        model: 'entity',
        key: 'public_id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    priority: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true
    }
  }, { charset: services.mysql.charset });
};

const down = async (query) => {
  try {
    await query.dropTable('headline_figures');
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