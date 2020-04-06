const { expect, sinon } = require('test/unit/util/chai');
const { STRING, DATE } = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('models/milestone');
const MilestoneFieldEntry = require('models/milestoneFieldEntry');
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

  it.skip('returns true if attribute exsists in class', () => {
    expect(Milestone.includes('uid')).to.be.ok();
  });

  it('#createSearch', () => {
    const key = 'test';
    const options = { options: 1 };
    Milestone.createSearch(key, options);
    sinon.assert.calledWith(modelUtils.createFilterOptions, key, options);
  });
});
