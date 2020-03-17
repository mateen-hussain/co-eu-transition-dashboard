const { expect, sinon } = require('test/unit/util/chai');
const { STRING, INTEGER, BOOLEAN, TEXT } = require('sequelize');
const Project = require('models/project');
const Milestone = require('models/milestone');
const modelUtils = require('helpers/models');
const ProjectFieldEntry = require('models/projectFieldEntry');

describe('models/project', () => {
  beforeEach(() => {
    sinon.stub(modelUtils, 'createFilterOptions');
  });

  afterEach(() => {
    modelUtils.createFilterOptions.restore();
  });

  it('called Project.init with the correct parameters', () => {
    expect(Project.init).to.have.been.calledWith({
      uid: {
        type: STRING(45),
        primaryKey: true,
        displayName: 'Project Name',
        searchable: true
      },
      department_name: {
        type: STRING(10),
        displayName: 'Department',
        allowNull: false,
        showCount: true,
        searchable: true
      },
      issue: {
        type: STRING(1024)
      },
      is_completed: {
        type: BOOLEAN,
        // displayName: 'Status',
        searchable: true
      },
      sro: {
        type: STRING(256)
      },
      description: {
        type: TEXT
      },
      impact: {
        type: INTEGER,
        displayName: 'Impact',
        searchable: true
      }
    });
  });

  it('called Project.hasMany with the correct parameters', () => {
    expect(Project.hasMany).to.have.been.calledWith(Milestone, { foreignKey: 'project_uid' });
    expect(Project.hasMany).to.have.been.calledWith(ProjectFieldEntry, { foreignKey: 'project_uid' });
    expect(Project.hasMany).to.have.been.calledWith(ProjectFieldEntry, { foreignKey: 'project_uid', as: 'ProjectFieldEntryFilter' });
    expect(Project.hasMany).to.have.been.calledWith(Project, { as: 'projects_count', foreignKey: 'uid' });
  });

  it('called ProjectFieldEntry.belongsTo with the correct parameters', () => {
    expect(ProjectFieldEntry.belongsTo).to.have.been.calledWith(Project, { foreignKey: 'project_uid' });
  });

  it.skip('returns true if attribute exsists in class', () => {
    expect(Project.includes('uid')).to.be.ok();
  });

  it('#createSearch', () => {
    const key = 'test 123';
    const options = {options: 1};
    Project.createSearch(key, options);
    sinon.assert.calledWith(modelUtils.createFilterOptions, key, options);
  });

  it.skip('#fields', () => {
    const key = 'test 123';
    const options = {options: 1};
    Project.createSearch(key, options);
    sinon.assert.calledWith(modelUtils.createFilterOptions, key, options);
  });
});