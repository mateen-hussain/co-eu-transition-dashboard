const { Model, STRING, ENUM, DATE, INTEGER, BOOLEAN } = require('sequelize');
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
            where: groupedSearch.milestone,
            separate: true
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField,
            separate: true
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

  async getProject (projectUid) {
    const departments = await this.getDepartments({
      attributes: [],
      include: [{
        model: Project,
        where: {
          uid: projectUid
        },
        include: [
          {
            model: Milestone,
            include: { all: true, nested: true }
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField
          }
        ]
       }]
    });

    const projects = departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);

    return projects.length ? projects[0] : undefined;
  }
}

User.init({
  id: {
    type: INTEGER,
    autoIncrement: true,
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
  },
  loginAttempts: {
    type: INTEGER,
    field: "login_attempts"
  },
  passwordReset: {
    type: BOOLEAN,
    field: "password_reset"
  }
}, { sequelize, modelName: 'user', tableName: 'user', timestamps: false });

User.belongsToMany(Department, { through: DepartmentUser, foreignKey: 'userId' });
Department.belongsToMany(User, { through: DepartmentUser, foreignKey: 'departmentName' });

module.exports = User;
