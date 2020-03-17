const { Model, STRING, BOOLEAN, ENUM } = require('sequelize');
const sequelize = require('services/sequelize');

class MilestoneField extends Model {}
MilestoneField.init({
  name: STRING(45),
  type: ENUM("string", "boolean", "integer", "float", "group"),
  is_active: BOOLEAN
}, { sequelize, modelName: 'milestoneField', tableName: 'milestone_field', timestamps: false });

module.exports = MilestoneField;