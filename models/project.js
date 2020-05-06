const { Model, STRING, INTEGER, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('./milestone');
const ProjectFieldEntry = require('./projectFieldEntry');
const ProjectField = require('./projectField');
const modelUtils = require('helpers/models');
const pick = require('lodash/pick');

class Project extends Model {
  static async fieldDefintions(user) {
    let validDepartments = [];
    if (user) {
      validDepartments = await user.getDepartments({ raw: true });
    }

    const projectFields = await ProjectField.findAll({
      where: { is_active: true }
    });

    projectFields.push(...[{
      name: 'uid',
      type: 'string',
      isRequired: true,
      isUnique: true,
      importColumnName: 'UID',
      group: 'Department and Project Information',
      order: 1,
      description: 'Project UID. Please leave this column blank. CO will assign a permanent UID for each project.'
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
      description: 'Please provide the name of your department.'
    },{
      name: 'title',
      type: 'string',
      importColumnName: 'Project Title',
      group: 'Department and Project Information',
      order: 4,
      description: 'Please set out a clear title to describe this project'
    },{
      name: 'sro',
      type: 'string',
      importColumnName: 'Project SRO + email address',
      group: 'Department and Project Information',
      order: 6,
      description: 'Please provide the name + email of the SRO per project.'
    },{
      name: 'description',
      type: 'string',
      importColumnName: 'Project Description',
      group: 'Department and Project Information',
      order: 5,
      description: 'What is the problem this project will address, and why does it need addressing? What will change or be different as a result of departure? How is this new or different to existing arrangements?'
    },{
      name: 'impact',
      type: 'integer',
      config: {
        options: [0,1,2,3]
      },
      importColumnName: 'Impact Rating',
      group: 'Department and Project Information',
      order: 6,
      description: 'Please indicate the severity of impact if project is not resolved in the transition period.'
    }]);

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
    showCount: true,
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
