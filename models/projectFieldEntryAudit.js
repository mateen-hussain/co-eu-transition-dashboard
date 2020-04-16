const { Model, STRING, INTEGER, TEXT, DATE, NOW } = require('sequelize');
const sequelize = require('services/sequelize');
const ProjectField = require('./projectField');

class ProjectFieldEntryAudit extends Model {}

ProjectFieldEntryAudit.init({
  fieldId: {
    type: INTEGER,
    field: 'project_field_id',
    primaryKey: true
  },
  projectUid: {
    type: STRING(45),
    field: 'project_uid',
    primaryKey: true
  },
  value: {
    type: TEXT
  },
  archivedAt: {
    type: DATE,
    field: 'archived_at',
    defaultValue: NOW
  }
}, { sequelize, modelName: 'projectFieldEntryAudit', tableName: 'project_field_entry_audit', createdAt: 'created_at', updatedAt: 'updated_at' });

ProjectFieldEntryAudit.belongsTo(ProjectField, { foreignKey: 'fieldId' });
ProjectField.hasMany(ProjectFieldEntryAudit, { foreignKey: 'fieldId' });

module.exports = ProjectFieldEntryAudit;
