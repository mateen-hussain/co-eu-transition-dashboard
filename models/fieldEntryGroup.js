const { STRING, Model, JSON } = require('sequelize');
const sequelize = require('services/sequelize');

class FieldEntryGroup extends Model {}
FieldEntryGroup.init({
  name: {
    type: STRING(10),
    primaryKey: true
  },
  config: {
    type: JSON
  }
}, { sequelize, modelName: 'fieldEntryGroup', tableName: 'field_entry_group', timestamps: false });

module.exports = FieldEntryGroup;