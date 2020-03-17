const { Model, STRING, BOOLEAN, ENUM } = require('sequelize');
const sequelize = require('services/sequelize');

class ProjectField extends Model {}
ProjectField.init({
  name: STRING(45),
  type: ENUM("string", "boolean", "integer", "float", "group"),
  is_active: BOOLEAN
}, { sequelize, modelName: 'projectField', tableName: 'project_field', timestamps: false });

module.exports = ProjectField;