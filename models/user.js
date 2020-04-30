const { Model, STRING, ENUM, DATE, INTEGER, BOOLEAN, Op } = require('sequelize');
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
const moment = require('moment');

class User extends Model {
  get isDepartmentalViewer () {
    return this.departments.length === 1 ? true : false;
  }

  async getProjects (search) {
    const departments = await this.getDepartmentsWithProjects(search);

    return departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);
  }

  async getDepartmentsWithProjects (search) {
    const groupedSearch = await modelUtils.groupSearchItems(search);

    const milestoneSearchCriteria = [...Object.keys(groupedSearch.milestone), ...Object.keys(groupedSearch.milestoneField)];
    const projectsMustHaveMilestones = milestoneSearchCriteria.length ? true : false;

    const milestoneInclude = [{
      model: MilestoneFieldEntry,
      include: MilestoneField
    }];

    groupedSearch.milestoneField.forEach((milestoneFieldQuery, index) => {
      include.push({
        required: true,
        as: `MilestoneFieldEntryFilter${String.fromCharCode('A'.charCodeAt() + index)}`,
        attributes: [],
        model: MilestoneFieldEntry,
        where: milestoneFieldQuery
      });
    });

    const include = [
      {
        model: Milestone,
        include: milestoneInclude,
        required: projectsMustHaveMilestones,
        where: groupedSearch.milestone
      },
      {
        model: ProjectFieldEntry,
        include: ProjectField
      }
    ];

    groupedSearch.projectField.forEach((projectFieldQuery, index) => {
      include.push({
        required: true,
        as: `ProjectFieldEntryFilter${String.fromCharCode('A'.charCodeAt() + index)}`,
        attributes: [],
        model: ProjectFieldEntry,
        where: projectFieldQuery
      });
    });

    const departmentsWithProjects = await this.getDepartments({
      include: [{
        model: Project,
        where: groupedSearch.project,
        required: true,
        include
      }]
    });

    // sort milestones inside projects
    departmentsWithProjects.forEach(departments => {
      departments.projects.forEach(projects => {
        projects.milestones = projects.milestones
          .sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
      });
    });

    return departmentsWithProjects;
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
            include: [{
              model: MilestoneFieldEntry,
              include: MilestoneField
            }]
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
    field: "must_change_password"
  }
}, { sequelize, modelName: 'user', tableName: 'user', timestamps: false });

User.belongsToMany(Department, { through: DepartmentUser, foreignKey: 'userId' });
Department.belongsToMany(User, { through: DepartmentUser, foreignKey: 'departmentName' });

module.exports = User;
