const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class UserRole extends Model {}
UserRole.init({
  user_id: {
    type: INTEGER
  },
  role_id: {
    type: INTEGER
  }
}, { sequelize, modelName: 'userRole', tableName: 'user_role', timestamps: false });

module.exports = UserRole;