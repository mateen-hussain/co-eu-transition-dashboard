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
const ProjectDetails = require('./projectDetails');


class User extends Model {
  async getProjects (search) {
    const groupedSearch = await modelUtils.groupSearchItems(search);

    const departments = await this.getDepartments({
      attributes: [],
      include: [{
        model: Project,
        where: groupedSearch.project,
        include: [
          {
            model: Milestone,
            include: [{
              model: MilestoneFieldEntry,
              include: MilestoneField
            }],
            required: true,
            where: groupedSearch.milestone
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField
          },
          {
            required: true,
            as: 'ProjectFieldEntryFilter',
            attributes: [],
            model: ProjectFieldEntry,
            where: groupedSearch.projectField
          }
        ]
       }]
    });

    return departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);
  }

  async getProject (projectUID) {
    const groupedSearch = modelUtils.groupSearchItems({ uid: [ projectUID ] });

    const departments = await this.getDepartments({
      attributes: [],
      include: [{
        model: ProjectDetails,
        where: groupedSearch.project,
        include: [
          {
            model: Milestone,
            include: { all: true, nested: true },
            required: true,
            where: groupedSearch.milestone
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField
          },
          {
            required: true,
            as: 'ProjectFieldEntryFilter',
            attributes: [],
            model: ProjectFieldEntry,
            where: {
              [Op.and]: groupedSearch.projectField
            }
          }
        ]
       }]
    });

    return departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);
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
