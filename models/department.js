const { STRING, Model } = require('sequelize');
const sequelize = require('services/sequelize');
const Project = require('./project');

class Department extends Model {}
Department.init({
  name: {
    type: STRING(10),
    primaryKey: true
  }
}, { sequelize, modelName: 'department', tableName: 'department', timestamps: false });

Department.hasMany(Project, { foreignKey: 'department_name' });
Project.belongsTo(Department, { foreignKey: 'department_name' });

module.exports = Department;