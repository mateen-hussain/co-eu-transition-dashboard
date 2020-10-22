const { expect, sinon } = require('test/unit/util/chai');
const Project = require('models/project');
const Milestone = require('models/milestone');
const modelUtils = require('helpers/models');
const ProjectFieldEntry = require('models/projectFieldEntry');
const ProjectField = require('models/projectField');
const sequelize = require('services/sequelize');

describe('models/project', () => {
  beforeEach(() => {
    sinon.stub(modelUtils, 'createFilterOptions');
    ProjectField.findAll = sinon.stub().returns([]);
  });

  afterEach(() => {
    modelUtils.createFilterOptions.restore();
  });

  it('called Project.hasMany with the correct parameters', () => {
    expect(Project.hasMany).to.have.been.calledWith(Milestone, { foreignKey: 'projectUid' });
    expect(Project.hasMany).to.have.been.calledWith(ProjectFieldEntry, { foreignKey: 'projectUid' });
    expect(Project.hasMany).to.have.been.calledWith(ProjectFieldEntry, { foreignKey: 'projectUid', as: 'ProjectFieldEntryFilter' });
    expect(Project.hasMany).to.have.been.calledWith(Project, { as: 'projects_count', foreignKey: 'uid' });
  });

  it('called ProjectFieldEntry.belongsTo with the correct parameters', () => {
    expect(ProjectFieldEntry.belongsTo).to.have.been.calledWith(Project, { foreignKey: 'projectUid' });
  });

  it('returns true if attribute exsists in class', () => {
    expect(Project.includes('uid')).to.be.ok;
  });

  it('#createSearch', () => {
    const key = 'test 123';
    const options = { options: 1 };
    Project.createSearch(key, options);
    sinon.assert.calledWith(modelUtils.createFilterOptions, key, options);
  });

  it('#fields', () => {
    const key = 'test 123';
    const options = { options: 1 };
    Project.createSearch(key, options);
    sinon.assert.calledWith(modelUtils.createFilterOptions, key, options);
  });

  it('#fieldDefinitions', async () => {
    const definitions = await Project.fieldDefinitions();

    expect(definitions).to.eql([
      {
        name: 'uid',
        type: 'group',
        isUnique: true,
        importColumnName: 'UID',
        group: 'Department and Project Information',
        order: 1,
        description: 'Project UID. Please leave this column blank. CO will assign a permanent UID for each project.',
        displayName: 'UID',
        isActive: true,
        config: {
          options: []
        }
      },{
        name: 'departmentName',
        type: 'group',
        isRequired: true,
        config: {
          options: []
        },
        importColumnName: 'Dept',
        group: 'Department and Project Information',
        order: 2,
        description: 'Please provide the name of your department.',
        displayName: 'Department',
        isActive: true
      },{
        name: 'title',
        type: 'string',
        displayName: 'Project Name',
        importColumnName: 'Project Title',
        group: 'Department and Project Information',
        order: 4,
        description: 'Please set out a clear title to describe this project',
        isActive: true
      },{
        name: 'sro',
        type: 'string',
        displayName: 'SRO name',
        importColumnName: 'Project SRO + email',
        group: 'Department and Project Information',
        order: 6,
        description: 'Please provide the name + email of the SRO per project.',
        isActive: true
      },{
        name: 'description',
        type: 'string',
        displayName: 'Description',
        importColumnName: 'Project Description',
        group: 'Department and Project Information',
        order: 5,
        description: 'What is the problem this project will address, and why does it need addressing? What will change or be different as a result of departure? How is this new or different to existing arrangements?',
        isActive: true
      },{
        name: 'impact',
        type: 'integer',
        displayName: 'Impact',
        config: {
          options: [0,1,2,3]
        },
        importColumnName: 'Impact Rating',
        group: 'Department and Project Information',
        order: 6,
        description: 'Please indicate the severity of impact if project is not resolved in the transition period.',
        isActive: true
      }
    ])

    sinon.assert.calledWith(ProjectField.findAll, { where: { is_active: true } });
  });

  describe('#import', () => {
    beforeEach(() => {
      sinon.stub(Project, 'importProjectFieldEntries').resolves();
      sinon.stub(Project, 'getNextIDIncrement').resolves('new-id');
    });

    afterEach(() => {
      Project.importProjectFieldEntries.restore();
      Project.getNextIDIncrement.restore();
    });

    it('only calls upsert with core fields', async () => {
      const project = { uid: 1, departmentName: 'name', customField: 'custom field' };
      const options = { someoption: 1 };
      const projectFields = [];

      await Project.import(project, projectFields, options);

      sinon.assert.calledWith(Project.upsert, { departmentName: 'name', uid: 1 }, options);
      sinon.assert.calledWith(Project.importProjectFieldEntries, project, projectFields, options);
    });

    it('assigns uid if none given', async () => {
      const project = { departmentName: 'name', customField: 'custom field' };
      const options = { someoption: 1 };
      const projectFields = [];

      await Project.import(project, projectFields, options);

      sinon.assert.calledWith(Project.upsert, { departmentName: 'name', uid: 'new-id' }, options);
      sinon.assert.calledWith(Project.importProjectFieldEntries, { departmentName: 'name', customField: 'custom field', uid: 'new-id' }, projectFields, options);
    });
  });

  describe('#importProjectFieldEntries', () => {
    beforeEach(() => {
      sinon.stub(ProjectFieldEntry, 'import').resolves();
    });

    afterEach(() => {
      ProjectFieldEntry.import.restore();
    });

    it('only imports field entries and not project attributes', async () => {
      const project = { uid: 1, fieldEntry1: 'field entry 1', fieldEntry2: 'field entry 2' };
      const options = { someoption: 1 };
      const projectFields = [{ name: 'fieldEntry1', id: 15 }, { name: 'fieldEntry2', id: 16 }];

      await Project.importProjectFieldEntries(project, projectFields, options);

      sinon.assert.calledWith(ProjectFieldEntry.import, { projectUid: 1, fieldId: 15, value: 'field entry 1' }, options);
      sinon.assert.calledWith(ProjectFieldEntry.import, { projectUid: 1, fieldId: 16, value: 'field entry 2' }, options);
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
      instance = new Project();
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
      const options = {
        model: Project,
        mapToModel: true
      };

      sequelize.query.returns([{ uid: 'MIL-01' }]);

      const newId = await Project.getNextIDIncrement('MIL');

      sinon.assert.calledWith(sequelize.query, "SELECT uid FROM project WHERE department_name='MIL' ORDER BY uid DESC LIMIT 1 FOR UPDATE", options);

      expect(newId).to.eql('MIL-02');
    });

    it('creates first project id if none returned', async () => {
      const options = {
        model: Project,
        mapToModel: true
      };
      sequelize.query.returns();

      const newId = await Project.getNextIDIncrement('PRO');

      sinon.assert.calledWith(sequelize.query, "SELECT uid FROM project WHERE department_name='PRO' ORDER BY uid DESC LIMIT 1 FOR UPDATE", options);

      expect(newId).to.eql('PRO-01');
    });

    it('uses transaction and lock if passed in', async () => {
      const options = {
        model: Project,
        mapToModel: true,
        transaction: {
          LOCK: 'some lock'
        },
        lock: 'some lock'
      };
      sequelize.query.returns();

      const newId = await Project.getNextIDIncrement('PRO', options);

      sinon.assert.calledWith(sequelize.query, "SELECT uid FROM project WHERE department_name='PRO' ORDER BY uid DESC LIMIT 1 FOR UPDATE", options);

      expect(newId).to.eql('PRO-01');
    });
  });
});
