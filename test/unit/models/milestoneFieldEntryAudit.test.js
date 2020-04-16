const { expect } = require('test/unit/util/chai');
const { STRING, INTEGER, TEXT, DATE, NOW } = require('sequelize');
const MilestoneFieldEntryAudit = require('models/milestoneFieldEntryAudit');
const MilestoneField = require('models/milestoneField');

describe('models/milestoneFieldEntryAudit', () => {
  it('called milestoneFieldEntryAudit.init with the correct parameters', () => {
    expect(MilestoneFieldEntryAudit.init).to.have.been.calledWith({
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
    });
  });

  it('adds correct relationships', () => {
    expect(MilestoneFieldEntryAudit.belongsTo).to.have.been.calledWith(MilestoneField, { foreignKey: 'fieldId' });
    expect(MilestoneField.hasMany).to.have.been.calledWith(MilestoneFieldEntryAudit, { foreignKey: 'fieldId' });
  });
});
