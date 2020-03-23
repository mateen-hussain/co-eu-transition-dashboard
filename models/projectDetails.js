const { Model, STRING, INTEGER , TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('./milestone');
const ProjectFieldEntry = require('./projectFieldEntry');
const modelUtils = require('helpers/models');

class Project extends Model {
  static includes(attributeKey) {
    return Object.keys(this.rawAttributes).includes(attributeKey);
  }

  static createSearch(attributeKey, options) {
    return modelUtils.createFilterOptions(attributeKey, options);
  }

  get fields() {
    const fields = modelUtils.transformForView(this);

    if(this.get('projectFieldEntries')){
      this.get('projectFieldEntries').forEach(field => {
        fields.push(field.fields);
      });
    }

    return fields;
  }
}

Project.init({
  uid: {
    type: STRING(45),
    primaryKey: true,
    displayName: 'Project Name'
  },
  department_name: {
    type: STRING(10),
    displayName: 'Department'
  },
  sro: {
    type: STRING(256),
    displayName: 'SRO Name'
  },
  description: {
    type: TEXT,
    displayName: 'Description'
  },
  impact: {
    type: INTEGER,
    displayName: 'Impact'
  }
}, { sequelize, modelName: 'project', tableName: 'project', createdAt: 'created_at', updatedAt: 'updated_at' });

Project.hasMany(Milestone, { foreignKey: 'project_uid' });
Project.hasMany(ProjectFieldEntry, { foreignKey: 'project_uid' });
Project.hasMany(ProjectFieldEntry, { foreignKey: 'project_uid', as: 'ProjectFieldEntryFilter' });
ProjectFieldEntry.belongsTo(Project, { foreignKey: 'project_uid' });
Project.hasMany(Project, { as: 'projects_count', foreignKey: 'uid' });

module.exports = Project;