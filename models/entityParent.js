const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class EntityParent extends Model {}
EntityParent.init({
  entityId: {
    type: INTEGER,
    field: "entity_id",
    primaryKey: true
  },
  parentEntityId: {
    type: INTEGER,
    field: "parent_entity_id",
    primaryKey: true
  }
}, { sequelize, modelName: 'entityParent', tableName: 'entity_parent', timestamps: false });

module.exports = EntityParent;
