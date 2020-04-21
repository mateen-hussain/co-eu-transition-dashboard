const { expect, sinon } = require('test/unit/util/chai');
const { STRING, DATE } = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('models/milestone');
const MilestoneFieldEntry = require('models/milestoneFieldEntry');
const MilestoneField = require('models/milestoneField');
const modelUtils = require('helpers/models');

describe('models/milestone', () => {
  beforeEach(() => {
    sinon.stub(modelUtils, 'createFilterOptions');
  });

  afterEach(() => {
    modelUtils.createFilterOptions.restore();
  });

  it('called Milestone.init with the correct parameters', () => {
    sinon.assert.calledWithMatch(Milestone.init, sinon.match({
      uid: {
        type: STRING(32),
        primaryKey: true,
        displayName: 'Milestone UID'
      },
      projectUid: {
        type: STRING(32),
        field: "project_uid"
      },
      description: {
        type: STRING,
        allowNull: false,
        displayName: 'Milestone Description'
      },
      date: {
        type: DATE,
        allowNull: true,
        displayName: 'Due Date'
      }
    }), { sequelize, modelName: 'milestone', tableName: 'milestone', createdAt: 'created_at', updatedAt: 'updated_at' });
  });

  it('called Milestone.belongsTo with the correct parameters', () => {
    expect(Milestone.hasMany).to.have.been.calledWith(MilestoneFieldEntry, { foreignKey: 'milestoneUid' });
  });

  it('#createSearch', () => {
    const key = 'test';
    const options = { options: 1 };
    Milestone.createSearch(key, options);
    sinon.assert.calledWith(modelUtils.createFilterOptions, key, options);
  });

  it('returns true if attribute exsists in class', () => {
    expect(Milestone.includes('uid')).to.be.ok;
  });

  it('#fieldDefintions', async () => {
    const definitions = await Milestone.fieldDefintions();

    expect(definitions).to.eql([
      {
        name: 'uid',
        type: 'string',
        isRequired: true,
        isUnique: true,
        importColumnName: 'Milestone UID'
      },
      {
        name: 'projectUid',
        type: 'string',
        isRequired: true,
        importColumnName: 'Project UID'
      },
      {
        name: 'description',
        type: 'string',
        importColumnName: 'Milestone description'
      },
      {
        name: 'date',
        type: 'date',
        importColumnName: 'Target date for delivery'
      }
    ])

    sinon.assert.calledWith(MilestoneField.findAll, { where: { is_active: true } });
  });

  describe('#import', () => {
    beforeEach(() => {
      sinon.stub(Milestone, 'importMilestoneFieldEntries').resolves();
    });

    afterEach(() => {
      Milestone.importMilestoneFieldEntries.restore();
    });

    it('only calls upsert with core fields', async () => {
      const milestone = { uid: 1, projectUid: 1, description: 'test', date: 'some date', customField: 'custom field' };
      const options = { someoption: 1 };
      const milestoneFields = [];

      await Milestone.import(milestone, milestoneFields, options);

      sinon.assert.calledWith(Milestone.upsert, { date: "some date", description: "test", projectUid: 1, uid: 1 }, options);
      sinon.assert.calledWith(Milestone.importMilestoneFieldEntries, milestone, milestoneFields, options);
    });
  });

  describe('#importMilestoneFieldEntries', () => {
    beforeEach(() => {
      sinon.stub(MilestoneFieldEntry, 'import').resolves();
    });

    afterEach(() => {
      MilestoneFieldEntry.import.restore();
    });

    it('only imports field entries and not milestone attributes', async () => {
      const milestone = { uid: 1, fieldEntry1: 'field entry 1', fieldEntry2: 'field entry 2' };
      const options = { someoption: 1 };
      const milestoneFields = [{ name: 'fieldEntry1', id: 15 }, { name: 'fieldEntry2', id: 16 }];

      await Milestone.importMilestoneFieldEntries(milestone, milestoneFields, options);

      sinon.assert.calledWith(MilestoneFieldEntry.import, { milestoneUid: 1, fieldId: 15, value: 'field entry 1' }, options);
      sinon.assert.calledWith(MilestoneFieldEntry.import, { milestoneUid: 1, fieldId: 16, value: 'field entry 2' }, options);
    });
  });

  describe('#fields', () => {
    const field = new Map();
    field.set('field1', {
      value: 'value 1'
    });
    field.set('field2', {
      value: 'value 2'
    });

    const sampleFields = [];
    sampleFields.push( { fields: field } );

    let instance = {};

    beforeEach(() => {
      instance = new Milestone();
      instance.get = sinon.stub().returns(sampleFields);

      sinon.stub(modelUtils, 'transformForView').returns(new Map());
    });

    afterEach(() => {
      modelUtils.transformForView.restore();
    });

    it('returns main attributes as well as fields', () => {
      const fields = instance.fields;
      expect(fields.get('field1').value).to.eql('value 1');
      expect(fields.get('field2').value).to.eql('value 2');
    });
  });
});
