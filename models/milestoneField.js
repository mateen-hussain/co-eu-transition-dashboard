const { Model, STRING, BOOLEAN, ENUM, JSON, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');

class MilestoneField extends Model {}
MilestoneField.init({
  name: STRING(45),
  type: ENUM("string", "boolean", "integer", "float", "group"),
  config: {
    type: JSON,
    get() {
      return this.getDataValue('config') || {};
    }
  },
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
  },
  description: {
    field: "description",
    type: TEXT
  }
}, { sequelize, modelName: 'milestoneField', tableName: 'milestone_field', timestamps: false });

module.exports = MilestoneField;
