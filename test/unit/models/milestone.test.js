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
    const config = {
      exportOptions: {
        header: {
          fill: "B7E1CE"
        },
        description: {
          fill: "CEEBDF"
        }
      }
    };
    expect(definitions).to.eql([
      {
        name: 'projectUid',
        type: 'string',
        isRequired: true,
        importColumnName: 'Project UID',
        config,
        description: 'The UID of the project these milestones cover'
      },{
        name: 'uid',
        type: 'string',
        isUnique: true,
        importColumnName: 'Milestone UID',
        config,
        description: 'Please leave this column blank. CO will assign a permanent UID for each milestone.'
      },{
        name: 'description',
        type: 'string',
        importColumnName: 'Milestone description',
        config,
        description: 'Name and short description of the milestone, covering what it is, who owns it, what form it takes and why it is required.'
      },{
        name: 'date',
        type: 'date',
        importColumnName: 'Target date for delivery',
        config: {
          exportOptions: {
            header: { fill: "6C9EE9" },
            description: { fill: "A4C2F2" }
          }
        },
        description: 'When is the date your are currently aiming to deliver this milestone?'
      }
    ])

    sinon.assert.calledWith(MilestoneField.findAll, { where: { is_active: true }, order: ['order'] });
  });

  describe('#import', () => {
    beforeEach(() => {
      sinon.stub(Milestone, 'importMilestoneFieldEntries').resolves();
      sinon.stub(Milestone, 'getNextIDIncrement').resolves('new-id');
    });

    afterEach(() => {
      Milestone.importMilestoneFieldEntries.restore();
      Milestone.getNextIDIncrement.restore();
    });

    it('only calls upsert with core fields', async () => {
      const milestone = { uid: 1, projectUid: 1, description: 'test', date: 'some date', customField: 'custom field' };
      const options = { someoption: 1 };
      const milestoneFields = [];

      await Milestone.import(milestone, milestoneFields, options);

      sinon.assert.calledWith(Milestone.upsert, { date: "some date", description: "test", projectUid: 1, uid: 1 }, options);
      sinon.assert.calledWith(Milestone.importMilestoneFieldEntries, milestone, milestoneFields, options);
    });

    it('assigns uid if none given', async () => {
      const milestone = { projectUid: 1, description: 'test', date: 'some date', customField: 'custom field' };
      const options = { someoption: 1 };
      const milestoneFields = [];

      await Milestone.import(milestone, milestoneFields, options);

      sinon.assert.calledWith(Milestone.getNextIDIncrement, 1);
      sinon.assert.calledWith(Milestone.upsert, { date: "some date", description: "test", projectUid: 1, uid: 'new-id' }, options);
      sinon.assert.calledWith(Milestone.importMilestoneFieldEntries, { projectUid: 1, description: 'test', date: 'some date', customField: 'custom field', uid: 'new-id' }, milestoneFields, options);
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

  describe('#getNextIDIncrement', () => {
    it('gets next uid', async () => {
      Milestone.findOne.returns({ uid: 'MIL-01-05' });

      const newId = await Milestone.getNextIDIncrement('MIL-01');

      sinon.assert.calledWith(Milestone.findOne, {
        where: { projectUid: 'MIL-01' },
        order: [['uid', 'DESC']]
      });

      expect(newId).to.eql('MIL-01-06');
    });

    it('creates first milestone id if none returned', async () => {
      Milestone.findOne.returns();

      const newId = await Milestone.getNextIDIncrement('MIL-01');

      sinon.assert.calledWith(Milestone.findOne, {
        where: { projectUid: 'MIL-01' },
        order: [['uid', 'DESC']]
      });

      expect(newId).to.eql('MIL-01-01');
    });

    it('uses transaction and lock if passed in', async () => {
      Milestone.findOne.returns();
      const options = {
        transaction: {
          LOCK: 'some lock'
        }
      };

      const newId = await Milestone.getNextIDIncrement('MIL-01', options);

      sinon.assert.calledWith(Milestone.findOne, {
        where: { projectUid: 'MIL-01' },
        order: [['uid', 'DESC']]
      }, { transaction: options.transaction, lock: options.transaction.LOCK });

      expect(newId).to.eql('MIL-01-01');
    });
  });
});
