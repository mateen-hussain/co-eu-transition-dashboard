const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class DepartmentUser extends Model {}
DepartmentUser.init({
  departmentName: {
    type: STRING(10),
    field: "department_name",
    primaryKey: true
  },
  userId: {
    type: INTEGER,
    field: "user_id",
    primaryKey: true
  }
}, { sequelize, modelName: 'departmentUser', tableName: 'department_user', timestamps: false });

module.exports = DepartmentUser;
