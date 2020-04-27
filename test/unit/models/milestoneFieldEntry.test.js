const MilestoneFieldEntry = require('models/milestoneFieldEntry');
const { expect, sinon } = require('test/unit/util/chai');
const { STRING, INTEGER, TEXT } = require('sequelize');
const MilestoneField = require('models/milestoneField');
const MilestoneFieldEntryAudit = require('models/milestoneFieldEntryAudit');

describe('models/milestoneFieldEntry', () => {
  describe('setup', () => {
    it('called milestoneFieldEntry.init with the correct parameters', () => {
      sinon.assert.calledWith(MilestoneFieldEntry.init,
        sinon.match({
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
          }
        })
      );
    });

    it('adds correct relationships', () => {
      expect(MilestoneFieldEntry.belongsTo).to.have.been.calledWith(MilestoneField, { foreignKey: 'fieldId' });
    });
  });

  describe('#import', () => {
    it('returns if no value', async () => {
      await MilestoneFieldEntry.import({});
      sinon.assert.notCalled(MilestoneFieldEntry.findOne);
      sinon.assert.notCalled(MilestoneFieldEntryAudit.create);
      sinon.assert.notCalled(MilestoneFieldEntry.upsert);
    });

    it('returns if existing value and new value are the same', async () => {
      MilestoneFieldEntry.findOne.resolves({ value: 'foo' });
      await MilestoneFieldEntry.import({ value: 'foo', milestoneUid: 1, fieldId: 1 });
      sinon.assert.calledWith(MilestoneFieldEntry.findOne, {
        where: {
          milestoneUid: 1,
          fieldId: 1
        }
      });

      sinon.assert.notCalled(MilestoneFieldEntryAudit.create);
      sinon.assert.notCalled(MilestoneFieldEntry.upsert);
    });

    it('creats an audit record if existing value does not match', async () => {
      const options = { option: 'bar' };
      const fieldToSave = { value: 'foo', milestoneUid: 1, fieldId: 1 };

      MilestoneFieldEntry.findOne.resolves({ value: 'bar', toJSON: sinon.stub().returns({ value: 'foo' }) });
      await MilestoneFieldEntry.import(fieldToSave, options);

      sinon.assert.calledWith(MilestoneFieldEntry.findOne, {
        where: {
          milestoneUid: 1,
          fieldId: 1
        }
      });

      sinon.assert.calledWith(MilestoneFieldEntryAudit.create, { value: 'foo' });
      sinon.assert.calledWith(MilestoneFieldEntry.upsert, fieldToSave, options);
    });
  });
});