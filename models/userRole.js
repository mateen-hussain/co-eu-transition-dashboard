const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class UserRole extends Model {}
UserRole.init({
  userId: {
    type: INTEGER,
    primaryKey: true,
    field: 'user_id'
  },
  roleId: {
    type: INTEGER,
    primaryKey: true,
    field: 'role_id'
  }
}, { sequelize, modelName: 'userRole', tableName: 'user_role', timestamps: false });

module.exports = UserRole;