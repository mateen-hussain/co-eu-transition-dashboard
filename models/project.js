const { Model, STRING, INTEGER, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('./milestone');
const ProjectFieldEntry = require('./projectFieldEntry');
const ProjectField = require('./projectField');
const modelUtils = require('helpers/models');
const pick = require('lodash/pick');
const logger = require('services/logger');
const sprintf = require('sprintf-js').sprintf;

class Project extends Model {
  static async fieldDefinitions(user) {
    let validDepartments = [];
    if (user) {
      validDepartments = await user.getDepartments({ raw: true });
    }

    const projectFields = [{
      name: 'uid',
      type: 'string',
      isUnique: true,
      importColumnName: 'UID',
      group: 'Department and Project Information',
      order: 1,
      description: 'Project UID. Please leave this column blank. CO will assign a permanent UID for each project.',
      displayName: 'UID',
      isActive: true
    },{
      name: 'departmentName',
      type: 'group',
      isRequired: true,
      config: {
        options: validDepartments.map(department => department.name)
      },
      importColumnName: 'Dept',
      group: 'Department and Project Information',
      order: 2,
      description: 'Please provide the name of your department.',
      displayName: 'Department',
      isActive: true
    },{
      name: 'title',
      type: 'string',
      displayName: 'Project Name',
      importColumnName: 'Project Title',
      group: 'Department and Project Information',
      order: 4,
      description: 'Please set out a clear title to describe this project',
      isActive: true
    },{
      name: 'sro',
      type: 'string',
      displayName: 'SRO name',
      importColumnName: 'Project SRO + email',
      group: 'Department and Project Information',
      order: 6,
      description: 'Please provide the name + email of the SRO per project.',
      isActive: true
    },{
      name: 'description',
      type: 'string',
      displayName: 'Description',
      importColumnName: 'Project Description',
      group: 'Department and Project Information',
      order: 5,
      description: 'What is the problem this project will address, and why does it need addressing? What will change or be different as a result of departure? How is this new or different to existing arrangements?',
      isActive: true
    },{
      name: 'impact',
      type: 'integer',
      displayName: 'Impact',
      config: {
        options: [0,1,2,3]
      },
      importColumnName: 'Impact Rating',
      group: 'Department and Project Information',
      order: 6,
      description: 'Please indicate the severity of impact if project is not resolved in the transition period.',
      isActive: true
    }];

    const fields = await ProjectField.findAll({
      where: { is_active: true }
    });

    projectFields.push(...fields);

    return projectFields;
  }

  static includes(attributeKey) {
    return Object.keys(this.rawAttributes).includes(attributeKey);
  }

  static createSearch(attributeKey, options) {
    return modelUtils.createFilterOptions(attributeKey, options);
  }

  static async import(project, projectFields, options) {
    const attributes = Object.keys(project);

    const projectAttributes = attributes.filter(attribute => this.rawAttributes[attribute]);
    const projectToUpsert = pick(project, projectAttributes);

    if (!projectToUpsert.uid) {
      try {
        projectToUpsert.uid = await Project.getNextIDIncrement(projectToUpsert.departmentName, options);
        project.uid = projectToUpsert.uid;
      } catch (error) {
        logger.error('Unable to generate next project uid');
        throw error;
      }
    }

    await this.upsert(projectToUpsert, options);

    await this.importProjectFieldEntries(project, projectFields, options);
  }

  static async importProjectFieldEntries(project, projectFields, options) {
    const attributes = Object.keys(project);

    const projectFieldEntryAttributes = attributes.filter(attribute => !this.rawAttributes[attribute]);
    const projectFieldEntries = projectFieldEntryAttributes.map(projectFieldEntryAttribute => {
      const projectField = projectFields.find(projectField => projectField.name === projectFieldEntryAttribute)
      return {
        projectUid: project.uid,
        fieldId: projectField.id,
        value: project[projectField.name]
      };
    });

    for (const projectFieldEntry of projectFieldEntries) {
      await ProjectFieldEntry.import(projectFieldEntry, options);
    }
  }

  get fields() {
    const fields = modelUtils.transformForView(this);

    if(this.get('projectFieldEntries')){
      this.get('projectFieldEntries').forEach(field => {
        field.fields.forEach((value, key) => fields.set(key, value));
      });
    }

    return fields;
  }

  static async getNextIDIncrement(departmentName, { transaction } = {}) {
    const options = {
      model: Project,
      mapToModel: true
    };

    if (transaction) {
      options.transaction = transaction;
      options.lock = transaction.LOCK
    }

    const projects = await sequelize.query(`SELECT uid FROM project WHERE department_name='${departmentName}' ORDER BY uid DESC LIMIT 1 FOR UPDATE`, options);

    if(!projects || !projects.length) {
      return `${departmentName}-01`;
    }

    const current = parseInt(projects[0].uid.split('-')[1]);
    return sprintf("%s-%02d", departmentName, current+1);
  }
}

Project.init({
  uid: {
    type: STRING(45),
    primaryKey: true,
    displayName: 'Project UID',
    searchable: true
  },
  departmentName: {
    type: STRING(10),
    displayName: 'Department',
    allowNull: false,
    searchable: true,
    field: "department_name"
  },
  title: {
    type: STRING(1024),
    displayName: 'Project Name',
    searchable: true
  },
  sro: {
    type: STRING(256)
  },
  description: {
    type: TEXT
  },
  impact: {
    type: INTEGER,
    displayName: 'Impact',
    searchable: true,
    allowNull: true
  }
}, { sequelize, modelName: 'project', tableName: 'project', createdAt: 'created_at', updatedAt: 'updated_at' });

Project.hasMany(Milestone, { foreignKey: 'projectUid' });
Milestone.belongsTo(Project, { foreignKey: 'projectUid' });
Project.hasMany(ProjectFieldEntry, { foreignKey: 'projectUid' });
Project.hasMany(ProjectFieldEntry, { foreignKey: 'projectUid', as: 'ProjectFieldEntryFilter' });
ProjectFieldEntry.belongsTo(Project, { foreignKey: 'projectUid' });
Project.hasMany(Project, { as: 'projects_count', foreignKey: 'uid' });

module.exports = Project;
