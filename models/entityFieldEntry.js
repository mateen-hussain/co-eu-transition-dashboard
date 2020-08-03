const { Model, INTEGER, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');

class EntityFieldEntry extends Model {}

EntityFieldEntry.init({
  entityId: {
    type: INTEGER,
    primaryKey: true,
    field: 'entity_id'
  },
  categoryFieldId: {
    type: INTEGER,
    primaryKey: true,
    field: "category_field_id"
  },
  value: {
    type: TEXT
  }
}, { sequelize, modelName: 'entityFieldEntry', tableName: 'entity_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = EntityFieldEntry;
