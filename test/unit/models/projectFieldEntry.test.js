const ProjectFieldEntry = require('models/projectFieldEntry');
const { expect, sinon } = require('test/unit/util/chai');
const { STRING, INTEGER, TEXT } = require('sequelize');
const ProjectField = require('models/projectField');
const ProjectFieldEntryAudit = require('models/projectFieldEntryAudit');

describe('models/projectFieldEntry', () => {
  describe('setup', () => {
    it('called projectFieldEntry.init with the correct parameters', () => {
      sinon.assert.calledWith(ProjectFieldEntry.init,
        sinon.match({
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
          }
        })
      );
    });

    it('adds correct relationships', () => {
      expect(ProjectFieldEntry.belongsTo).to.have.been.calledWith(ProjectField, { foreignKey: 'fieldId' });
      expect(ProjectField.hasMany).to.have.been.calledWith(ProjectFieldEntry, { foreignKey: 'fieldId' });
    });
  });

  describe('#import', () => {
    it('returns if no value', async () => {
      await ProjectFieldEntry.import({});
      sinon.assert.notCalled(ProjectFieldEntry.findOne);
      sinon.assert.notCalled(ProjectFieldEntryAudit.create);
      sinon.assert.notCalled(ProjectFieldEntry.upsert);
    });

    it('returns if existing value and new value are the same', async () => {
      ProjectFieldEntry.findOne.resolves({ value: 'foo' });
      await ProjectFieldEntry.import({ value: 'foo', projectUid: 1, fieldId: 1 });
      sinon.assert.calledWith(ProjectFieldEntry.findOne, {
        where: {
          projectUid: 1,
          fieldId: 1
        }
      });

      sinon.assert.notCalled(ProjectFieldEntryAudit.create);
      sinon.assert.notCalled(ProjectFieldEntry.upsert);
    });

    it('creats an audit record if existing value does not match', async () => {
      const options = { option: 'bar' };
      const fieldToSave = { value: 'foo', projectUid: 1, fieldId: 1 };

      ProjectFieldEntry.findOne.resolves({ value: 'bar', toJSON: sinon.stub().returns({ value: 'foo' }) });
      await ProjectFieldEntry.import(fieldToSave, options);

      sinon.assert.calledWith(ProjectFieldEntry.findOne, {
        where: {
          projectUid: 1,
          fieldId: 1
        }
      });

      sinon.assert.calledWith(ProjectFieldEntryAudit.create, { value: 'foo' });
      sinon.assert.calledWith(ProjectFieldEntry.upsert, fieldToSave, options);
    });
  });
});