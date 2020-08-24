const { Model, INTEGER, STRING } = require('sequelize');
const sequelize = require('services/sequelize');

class Role extends Model {}
Role.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  name: {
    type: STRING(45)
  }
}, { sequelize, modelName: 'role', tableName: 'role', timestamps: false });

module.exports = Role;