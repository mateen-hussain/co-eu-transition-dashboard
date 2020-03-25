const { Model, STRING, ENUM, DATE, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const Project = require('./project');
const Milestone = require('./milestone');
const ProjectFieldEntry = require('./projectFieldEntry');
const ProjectField = require('./projectField');
const MilestoneFieldEntry = require('./milestoneFieldEntry');
const MilestoneField = require('./milestoneField');
const Department = require('./department');
const DepartmentUser = require('./departmentUser');
const modelUtils = require('helpers/models');
const logger = require('services/logger');

class User extends Model {
  async getProjects (search) {
    const groupedSearch = await modelUtils.groupSearchItems(search);

    return await Project.findAll({
      where: groupedSearch.project,
      include: [
        {
          model: Department,
          required: true,
          include: {
            model: User,
            required: true,
            through: { attributes: [] },
            where: {
              id: this.id
            }
          }
        },
        {
          model: Milestone,
          include: [{
            model: MilestoneFieldEntry,
          }],
          where: groupedSearch.milestone
        },
        {
          model: ProjectFieldEntry,
          as: 'ProjectFieldEntryFilter',
          where: groupedSearch.projectField
        },
      ]
    });
  }
}

User.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  email: STRING(64),
  hashedPassphrase: {
    type: STRING(128),
    field: "hashed_passphrase",
  },
  lastLoginAt: {
    type: DATE,
    field: "last_login_at"
  },
  role: {
    type: ENUM('admin', 'user')
  },
  twofaSecret: {
    type: STRING(128),
    field: "twofa_secret"
  }
}, { sequelize, modelName: 'user', tableName: 'user', timestamps: false });

User.belongsToMany(Department, { through: DepartmentUser, foreignKey: 'userId' });
Department.belongsToMany(User, { through: DepartmentUser, foreignKey: 'departmentName' });

module.exports = User;
