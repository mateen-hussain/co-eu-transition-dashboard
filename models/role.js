const { Model, INTEGER, ENUM } = require('sequelize');
const sequelize = require('services/sequelize');

class Role extends Model {}
Role.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  name: {
    type: ENUM('uploader', 'viewer', 'admin', 'management', 'guest')
  }
}, { sequelize, modelName: 'role', tableName: 'role', timestamps: false });

module.exports = Role;