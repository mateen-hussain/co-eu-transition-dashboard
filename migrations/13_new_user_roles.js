const { services } = require('config');
const logger = require('services/logger');
const Sequelize = require('sequelize');

const up = async (query) => {
  await query.createTable('role', {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    name: {
      type: Sequelize.DataTypes.STRING(45),
      allowNull: true,
      unique: true
    }
  }, { charset: services.mysql.charset });

  await query.bulkInsert('role', [
    {
      name: 'admin'
    },{
      name: 'uploader'
    },{ 
      name: 'viewer'
    },{ 
      name: 'management'
    },{
      name: 'management_overview'
    }
  ]);

  await query.createTable('user_role', {
    user_id: {
      type: Sequelize.DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    role_id: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false
    }
  }, { charset: services.mysql.charset });

  await query.addConstraint('user_role', ['user_id'], {
    type: 'FOREIGN KEY',
    name: 'fk_user_role_user1',
    references: {
      table: 'user',
      field: 'id',
    },
    onDelete: 'no action',
    onUpdate: 'no action'
  });

  await query.addConstraint('user_role', ['role_id'], {
    type: 'FOREIGN KEY',
    name: 'fk_user_role_role1',
    references: {
      table: 'role',
      field: 'id',
    },
    onDelete: 'no action',
    onUpdate: 'no action'
  });
};

const down = async (query) => {
  try {
    await query.dropTable('user_role');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('role');
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