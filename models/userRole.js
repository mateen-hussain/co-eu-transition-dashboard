const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class UserRole extends Model {
  static async getUserRole(userId) {
    const roles = await UserRole.findOne({
      where: { user_id: userId }
    });
    console.log(roles);
  }
}

UserRole.init({
  user_id: {
    type: INTEGER
  },
  role_id: {
    type: INTEGER
  }
}, { sequelize, modelName: 'userRole', tableName: 'user_role', timestamps: false });

module.exports = UserRole;