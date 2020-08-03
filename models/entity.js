const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const EntityParent = require('./entityParent');
const EntityFieldEntry = require('./entityFieldEntry');
const EntityFieldEntryAudit = require('./entityFieldEntryAudit');

class Entity extends Model {}

Entity.init({
  id: {
    type: INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  publicId: {
    type: STRING(64),
    allowNull: true,
    field: "public_id"
  },
  categoryId: {
    type: INTEGER,
    allowNull: false,
    field: "category_id"
  }
}, { sequelize, modelName: 'entity', tableName: 'entity', createdAt: 'created_at', updatedAt: false });

Entity.belongsToMany(Entity, { through: EntityParent, foreignKey: 'parentEntityId', as: 'children', otherKey: 'entityId' });

Entity.hasMany(EntityFieldEntry, { foreignKey: 'entityId' });
EntityFieldEntry.belongsTo(Entity, { foreignKey: 'entityId' });

Entity.hasMany(EntityFieldEntryAudit, { foreignKey: 'entityId' });
EntityFieldEntryAudit.belongsTo(Entity, { foreignKey: 'entityId' });

module.exports = Entity;
