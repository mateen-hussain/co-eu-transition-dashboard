const { services } = require('config');
const logger = require('services/logger');
const Sequelize = require('sequelize');

const categories = ['Theme', 'Statement', 'Measure', 'Communication', 'Project', 'Milestone'];

const up = async (query) => {
  await query.createTable('category', {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    public_id_format: {
      type: Sequelize.DataTypes.STRING(50)
    }
  }, { charset: services.mysql.charset });

  await query.bulkInsert('category', categories.map(category => {
    return {
      name: category,
      public_id_format: `${category.toLowerCase()}-`
    };
  }));

  await query.createTable('category_field', {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'category',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    name: {
      type: Sequelize.DataTypes.STRING(50),
      allowNull: false
    },
    display_name: {
      type: Sequelize.DataTypes.STRING(50),
      allowNull: false
    },
    type: {
      type: Sequelize.DataTypes.ENUM("string", "boolean", "integer", "float", "group", "date"),
      allowNull: false
    },
    config: {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false
    },
    is_required: {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: false
    },
    description: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    priority: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true
    },
  }, { charset: services.mysql.charset });

  await query.bulkInsert('category_field', categories.reduce((items, category, index) => {
    items.push({
      category_id: index + 1,
      name: 'name',
      display_name: 'Name',
      type: 'string',
      is_active: true,
      is_required: true,
      description: `Name of ${category}`,
      priority: 1,
    });

    items.push({
      category_id: index + 1,
      name: 'description',
      display_name: 'Description',
      type: 'string',
      is_active: true,
      is_required: false,
      description: `Description of ${category}`,
      priority: 2
    });

    return items;
  }, []));

  await query.createTable('category_parent', {
    category_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'category',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    parent_category_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'category',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    }
  }, { charset: services.mysql.charset });

  await query.bulkInsert('category_parent', [{
    category_id: 2,
    parent_category_id: 1
  },{
    category_id: 3,
    parent_category_id: 2
  },{
    category_id: 4,
    parent_category_id: 2
  },{
    category_id: 5,
    parent_category_id: 2
  },{
    category_id: 6,
    parent_category_id: 5
  }]);

  await query.createTable('entity', {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'category',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    public_id: {
      type: Sequelize.DataTypes.STRING(64),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, { charset: services.mysql.charset });

  await query.createTable('entity_parent', {
    entity_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'entity',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade',
      primaryKey: true
    },
    parent_entity_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'entity',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade',
      primaryKey: true
    }
  }, { charset: services.mysql.charset });

  await query.createTable('entity_field_entry', {
    entity_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'entity',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade',
      primaryKey: true
    },
    category_field_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'category_field',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade',
      primaryKey: true
    },
    value: {
      type: Sequelize.DataTypes.TEXT
    },
    created_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { charset: services.mysql.charset });

  await query.createTable('entity_field_entry_audit', {
    entity_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'entity',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    category_field_id: {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'category_field',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    value: {
      type: Sequelize.DataTypes.TEXT
    },
    created_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    archived_at: {
      type: Sequelize.DataTypes.DATE,
      defaultValue: Sequelize.NOW
    }
  }, { charset: services.mysql.charset });

  await query.addColumn(
    'bulk_import',
    'category',
    {
      type: Sequelize.DataTypes.STRING(64),
    }
  );
};

const down = async (query) => {

  try {
    await query.dropTable('entity_field_entry_audit');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('entity_field_entry');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('entity_parent');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('entity');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('category_parent');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('category_field');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.dropTable('category');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try {
    await query.removeColumn(
      'bulk_import',
      'category'
    );
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
};