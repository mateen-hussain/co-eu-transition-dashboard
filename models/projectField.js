const { Model, STRING, BOOLEAN, ENUM, JSON } = require('sequelize');
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
  importColumnName: {
    field: "import_column_name",
    type: STRING(300),
  }
}, { sequelize, modelName: 'projectField', tableName: 'project_field', timestamps: false });

module.exports = ProjectField;
