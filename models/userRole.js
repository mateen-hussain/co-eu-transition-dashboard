const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const Role = require('./role');

class UserRole extends Model {
  static async getUserRole(userId) {
    const user = await UserRole.findAll({
      where: { user_id: userId },
      raw : true
    });

    if(!user) {
      throw new Error('Unknown user');
    }

    if(user.length) {
      const roles = await Role.findAll({
        where: { id: user.map(user => user.role_id) },
        raw : true
      });
      
      const result = {
        userId,
        role: roles.map(role => role.name)
      }
      return result;
    }
  }
}

UserRole.init({
  user_id: {
    type: INTEGER,
    primaryKey: true
  },
  role_id: {
    type: INTEGER
  }
}, { sequelize, modelName: 'userRole', tableName: 'user_role', timestamps: false });

module.exports = UserRole;