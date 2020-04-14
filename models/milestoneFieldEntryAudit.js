const { Model, STRING, INTEGER, TEXT, DATE, NOW } = require('sequelize');
const sequelize = require('services/sequelize');
const MilestoneField = require('./milestoneField');

class MilestoneFieldEntryAudit extends Model {}

MilestoneFieldEntryAudit.init({
  fieldId: {
    type: INTEGER,
    field: 'milestone_field_id',
    primaryKey: true
  },
  milestoneUid: {
    type: STRING(45),
    field: 'milestone_uid',
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
}, { sequelize, modelName: 'milestoneFieldEntryAudit', tableName: 'milestone_field_entry_audit', createdAt: 'created_at', updatedAt: 'updated_at' });

MilestoneFieldEntryAudit.belongsTo(MilestoneField, { foreignKey: 'fieldId' });
MilestoneField.hasMany(MilestoneFieldEntryAudit, { foreignKey: 'fieldId' });

module.exports = MilestoneFieldEntryAudit;
