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
const Role = require('./role');
const UserRole = require('./userRole');
const moment = require('moment');
const DAO = require('services/dao');
const Entity = require('./entity');
const EntityUser = require('./entityUser');

class User extends Model {
  get isDepartmentalViewer () {
    return this.departments.length === 1 ? true : false;
  }

  async getProjects (search) {
    const dao = new DAO({
      sequelize: sequelize
    });

    const projects = await dao.getAllData(this.id, search);

    projects.forEach(project => {
      project.milestones = project.milestones
        .sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
    });

    return projects;
  }

  async getDepartmentsWithProjects (search) {
    const dao = new DAO({
      sequelize: sequelize
    });
    const projects = await dao.getAllData(this.id,search);
    let departments = {};

    projects.forEach( project => {
      if (project.milestones && project.milestones.length > 0) {
        if (Array.isArray(departments[project.departmentName])) {
          departments[project.departmentName].push(project);
        } else {
          departments[project.departmentName] = [project];
        }
      }
    });

    const departmentObjects = await this.getDepartments();
    let result = [];
    departmentObjects .forEach( (department) => {
      if (departments[department.name]) {
        department.projects = departments[department.name];
        department.dataValues.projects = departments[department.name];
        result.push(department);
      }
    });


    // sort milestones inside projects
    result.forEach(departments => {
      departments.projects.forEach(projects => {
        projects.milestones = projects.milestones
          .sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
      });
    });

    return result;
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

  async getProjectMilestone(milestoneUid) {
    const departments = await this.getDepartments({
      attributes: [],
      include: [{
        model: Project,
        include: [
          {
            model: Milestone,
            where: { uid: milestoneUid },
            include: [{
              model: MilestoneFieldEntry,
              include: MilestoneField
            }],
            required: true
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField
          }
        ],
        required: true
      }]
    });

    const projects = departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);

    if(!projects.length) {
      return {};
    }

    return {
      project: projects[0],
      milestone: projects[0].milestones[0]
    };
  }

  get hasViewAllPermissions() {
    return this.departments.length > 1;
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
    type: ENUM('uploader', 'viewer', 'administrator')
  },
  twofaSecret: {
    type: STRING(128),
    field: "twofa_secret"
  },
  loginAttempts: {
    type: INTEGER,
    field: "login_attempts"
  },
  mustChangePassword: {
    type: BOOLEAN,
    field: "must_change_password"
  }
}, { sequelize, modelName: 'user', tableName: 'user', timestamps: false });

User.belongsToMany(Department, { through: DepartmentUser, foreignKey: 'userId' });
Department.belongsToMany(User, { through: DepartmentUser, foreignKey: 'departmentName' });

User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId' });

User.belongsToMany(Entity, { through: EntityUser, foreignKey: 'userId' });
Entity.belongsToMany(User, { through: EntityUser, foreignKey: 'entityId' });

module.exports = User;
