const { expect } = require('test/unit/util/chai');
const { STRING, INTEGER, TEXT, DATE, NOW } = require('sequelize');
const ProjectFieldEntryAudit = require('models/projectFieldEntryAudit');
const ProjectField = require('models/projectField');
ProjectField

describe('models/projectFieldEntryAudit', () => {
  it('called projectFieldEntryAudit.init with the correct parameters', () => {
    expect(ProjectFieldEntryAudit.init).to.have.been.calledWith({
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
    });
  });

  it('adds correct relationships', () => {
    expect(ProjectFieldEntryAudit.belongsTo).to.have.been.calledWith(ProjectField, { foreignKey: 'fieldId' });
    expect(ProjectField.hasMany).to.have.been.calledWith(ProjectFieldEntryAudit, { foreignKey: 'fieldId' });
  });
});
