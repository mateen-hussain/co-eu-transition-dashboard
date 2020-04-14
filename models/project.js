const { Model, STRING, INTEGER, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('./milestone');
const ProjectFieldEntry = require('./projectFieldEntry');
const ProjectField = require('./projectField');
const modelUtils = require('helpers/models');
const { pluck } = require('helpers/utils');
const validation = require('helpers/validation');

class Project extends Model {
  static async fieldDefintions() {
    const projectFields = await ProjectField.findAll({
      where: { is_active: true }
    });

    projectFields.push(...[{
      name: 'uid',
      type: 'string',
      isRequired: true,
      isUnique: true,
      miTemplateColumnName: 'UID'
    },{
      name: 'departmentName',
      type: 'string',
      isRequired: true,
      miTemplateColumnName: 'Dept'
    },{
      name: 'title',
      type: 'string',
      miTemplateColumnName: 'Project Title'
    },{
      name: 'sro',
      type: 'string',
      miTemplateColumnName: 'Project SRO + email address'
    },{
      name: 'description',
      type: 'string',
      miTemplateColumnName: 'Project Description'
    },{
      name: 'impact',
      type: 'integer',
      config: {
        options: [0,1,2,3]
      },
      miTemplateColumnName: 'Impact Rating'
    }]);

    return projectFields;
  }

  static includes(attributeKey) {
    return Object.keys(this.rawAttributes).includes(attributeKey);
  }

  static createSearch(attributeKey, options) {
    return modelUtils.createFilterOptions(attributeKey, options);
  }

  static async validateColumns(columns) {
    const fieldDefintions = await this.fieldDefintions();

    const requiredColumns = pluck(fieldDefintions, 'miTemplateColumnName');
    return validation.validateColumns(columns, requiredColumns);
  }

  static async import(project, projectFields, options) {
    const attributes = Object.keys(project);

    const projectAttribites = attributes.filter(attribute => this.rawAttributes[attribute]);
    const projectToUpsert = projectAttribites.reduce((projectToUpsert, attribute) => {
      projectToUpsert[attribute] = project[attribute];
      return projectToUpsert;
    }, {});

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
    // set(val) {
    //   const isNA = String(val || '').toLowerCase().trim() === 'n/a';
    //   if (!isNA) {
    //     this.setDataValue('impact', val);
    //   }
    // },
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
