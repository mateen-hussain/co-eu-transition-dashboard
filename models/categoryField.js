const { Model, STRING, BOOLEAN, ENUM, INTEGER, JSON, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const EntityFieldEntry = require('./entityFieldEntry');
const EntityFieldEntryAudit = require('./entityFieldEntryAudit');

class CategoryField extends Model {}
CategoryField.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  categoryId: {
    field: 'category_id',
    type: INTEGER
  },
  name: STRING(45),
  displayName: {
    field: "display_name",
    type: STRING(300),
  },
  type: ENUM("string", "boolean", "integer", "float", "group"),
  config: JSON,
  isActive: {
    type: BOOLEAN,
    field: "is_active",
  },
  isRequired: {
    type: BOOLEAN,
    field: "is_required"
  },
  description: {
    field: "description",
    type: TEXT
  },
  order: {
    type: INTEGER
  }
}, { sequelize, modelName: 'categoryField', tableName: 'category_field', timestamps: false });

CategoryField.hasMany(EntityFieldEntry, { foreignKey: 'categoryFieldId' });
EntityFieldEntry.belongsTo(CategoryField, { foreignKey: 'categoryFieldId' });

CategoryField.hasMany(EntityFieldEntryAudit, { foreignKey: 'categoryFieldId' });
EntityFieldEntryAudit.belongsTo(CategoryField, { foreignKey: 'categoryFieldId' });

module.exports = CategoryField;
