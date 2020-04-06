const { Model, STRING, INTEGER, TEXT } = require('sequelize');
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
    set(val) {
      const isNA = String(val || '').toLowerCase().trim() === 'n/a';
      if (!isNA) {
        this.setDataValue('impact', val);
      }
    },
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
