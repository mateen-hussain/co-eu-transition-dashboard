const { Model, STRING, INTEGER, TEXT, DATE, NOW } = require('sequelize');
const sequelize = require('services/sequelize');
const MilestoneField = require('./milestoneField');
const moment = require('moment');

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
    defaultValue: NOW,
    get() {
      return moment(this.getDataValue('archivedAt'), 'YYYY-MM-DD').format('DD/MM/YYYY');
    }
  }
}, { sequelize, modelName: 'milestoneFieldEntryAudit', tableName: 'milestone_field_entry_audit', createdAt: 'created_at', updatedAt: 'updated_at' });

MilestoneFieldEntryAudit.belongsTo(MilestoneField, { foreignKey: 'fieldId' });
MilestoneField.hasMany(MilestoneFieldEntryAudit, { foreignKey: 'fieldId' });

module.exports = MilestoneFieldEntryAudit;
