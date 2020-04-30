const { Model, STRING, BOOLEAN, ENUM, INTEGER, JSON, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');

class ProjectField extends Model {}
ProjectField.init({
  name: STRING(45),
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
  displayName: {
    field: "display_name",
    type: STRING(300),
  },
  description: {
    field: "description",
    type: TEXT
  },
  importColumnName: {
    field: "import_column_name",
    type: STRING(300),
  },
  order: {
    type: INTEGER
  },
  group: {
    type: STRING(50),
  }
}, { sequelize, modelName: 'projectField', tableName: 'project_field', timestamps: false });

module.exports = ProjectField;
