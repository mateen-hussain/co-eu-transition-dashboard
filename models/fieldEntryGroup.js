const { STRING, Model } = require('sequelize');
const sequelize = require('services/sequelize');

class FieldEntryGroup extends Model {}
FieldEntryGroup.init({
  name: {
    type: STRING(10),
    primaryKey: true
  }
}, { sequelize, modelName: 'fieldEntryGroup', tableName: 'field_entry_group', timestamps: false });

module.exports = FieldEntryGroup;