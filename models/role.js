const { Model, INTEGER, ENUM } = require('sequelize');
const sequelize = require('services/sequelize');
const UserRole = require('./userRole');

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

Role.hasMany(UserRole, { foreignKey: 'role_id' });
UserRole.belongsTo(Role, { foreignKey: 'role_id' });

module.exports = Role;