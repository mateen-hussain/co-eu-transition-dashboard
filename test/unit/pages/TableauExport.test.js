const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const Entity = require('models/entity');
const Category = require('models/category');
const proxyquire = require('proxyquire');
const Milestone = require('models/milestone');

let page = {};
let res = {
  json:  sinon.stub()
};
let req = {};

let getAllDataStub = sinon.stub();
const daoStub = function() {
  return {
    getAllData: getAllDataStub
  };
};

describe('pages/tableau-export/TableauExport', () => {
  beforeEach(() => {
    const TableauExport = proxyquire('pages/tableau-export/TableauExport', {
      'services/dao': daoStub
    });

    page = new TableauExport('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.tableauExport);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url', () => {
      expect(page.pathToBind).to.eql(`${paths.tableauExport}/:type/:mode?`);
    });
  });

  describe('#exportingMeasures', () => {
    it('returns correct url', () => {
      page.req = { params: { type: 'measures' } };
      expect(page.exportingMeasures).to.be.ok;
    });

    it('returns correct url', () => {
      page.req = { params: { type: 'measures' } };
      expect(page.exportingMeasures).to.be.ok;
    });
  });

  describe('#exportingProjects', () => {
    it('returns correct url', () => {
      page.req = { params: { type: 'projects-milestones' } };
      expect(page.exportingProjects).to.be.ok;
    });
  });

  describe('#exportingCommunications', () => {
    it('returns correct url', () => {
      page.req = { params: { type: 'communications' } };
      expect(page.exportingCommunications).to.be.ok;
    });
  });

  describe('#showForm', () => {
    it('should return true when type is set and mode is not', () => {
      page.req = { params: { type: 'measures',  } };
      expect(page.showForm).to.be.ok;
    });
  });

  describe('#exportSchema', () => {
    it('should return true when type is set and mode is set to schema', () => {
      page.req = { params: { type: 'measures', mode: 'schema' } };
      expect(page.exportSchema).to.be.ok;
    });
  });

  describe('#addParents', () => {
    it('add parents category name for each entity parent', async () => {
      const entityObject = {};
      const entity = {
        parents: [{}]
      };

      Entity.findOne.resolves({
        entityFieldEntries: [{
          categoryField: {
            name: 'groupDescription',
            type: 'string'
          },
          value: 'Some name'
        }],
        category: {
          name: 'Category name'
        },
        parents: []
      });

      await page.addParents(entity, entityObject);

      expect(entityObject).to.eql({ ['Category name - 1']: { value:'Some name', type: 'string' } });
    });
  });

  describe('#getEntitiesFlatStructure', () => {
    it('gets entites with a flat structure', async () => {
      sinon.stub(page, 'addParents').resolves();

      Entity.findAll.resolves([{
        publicId: '1',
        entityFieldEntries: [{
          categoryField: {
            displayName: 'name',
            type: 'string'
          },
          value: 'some name'
        }],
        parents: []
      },{
        publicId: '1',
        entityFieldEntries: [{
          categoryField: {
            displayName: 'name',
            type: 'string'
          },
          value: 'some name'
        }],
        parents: []
      }]);

      const entityObjects = await page.getEntitiesFlatStructure({ id: 1 });

      expect(entityObjects).to.eql([
        {
          'Field 1': { value: 'some name', type: 'string' },
          'Public ID': { value: '1', type: 'string' }
        },
        {
          'Field 1': { value: 'some name', type: 'string' },
          'Public ID': { value: '1', type: 'string' }
        }
      ]);

    });
  });

  describe('#exportMeasures', () => {
    it('gets all metrics and creats an object', async () => {
      const resp = [{ test: 'test' }];
      sinon.stub(page, 'getEntitiesFlatStructure').resolves(resp);

      Category.findOne.resolves({
        id: 1
      });

      await page.exportMeasures(req, res);

      sinon.assert.calledWith(page.getEntitiesFlatStructure, { id: 1 });
      sinon.assert.calledWith(res.json, resp);
    });
  });

  describe('#exportCommunications', () => {
    it('gets all comms and creats an object', async () => {
      const resp = { data: 'data' };
      sinon.stub(page, 'getEntitiesFlatStructure').resolves(resp);

      Category.findOne.resolves({
        id: 1
      });

      await page.exportCommunications(req, res);

      sinon.assert.calledWith(page.getEntitiesFlatStructure, { id: 1 });
      sinon.assert.calledWith(res.json, resp);
    });
  });

  describe('#mergeProjectsWithEntities', () => {
    beforeEach(() => {
      Milestone.fieldDefinitions = sinon.stub().returns([{
        name: 'name',
        displayName: 'Name'
      }]);
    });

    it('get projects and merge with project entities', async () => {
      const entities = [{
        'Public ID': { value: 1, type: 'int' }
      },{
        'Public ID': { value: 2, type: 'int' }
      }];

      const projects = [{
        uid: 1,
        name: 'project 1',
        title: 'project 1',
        projectFieldEntries: [{
          projectField: {
            displayName: 'UID'
          },
          value: 'UID 1'
        }],
        milestones: [{
          name: 'milestone 1',
          milestoneFieldEntries: [{
            milestoneField: {
              displayName: 'date',
              type: 'string'
            },
            value: 'date 1'
          }]
        }]
      },{
        uid: 2,
        name: 'project 2',
        title: 'project 2',
        projectFieldEntries: [{
          projectField: {
            displayName: 'UID'
          },
          value: 'UID 2'
        }],
        milestones: [{
          name: 'milestone 2',
          milestoneFieldEntries: [{
            milestoneField: {
              displayName: 'date',
              type: 'string'
            },
            value: 'date 2'
          }]
        }]
      }];
      getAllDataStub.resolves(projects);

      const mergedEntities = await page.mergeProjectsWithEntities(entities);
      expect(mergedEntities).to.eql([
        {
          'Public ID': { value: 1, type: 'int' },
          'Project - UID': { value: 1, type: 'string' },
          'Milestone - Name': { value: 'milestone 1', type: 'string' },
          'Milestone - date': { value: 'date 1', type: 'string' },
          'Project - Name': { value: 'project 1', type: 'string' }
        },
        {
          'Public ID': { value: 2, type: 'int' },
          'Project - UID': { value: 2, type: 'string' },
          'Milestone - Name': { value: 'milestone 2', type: 'string' },
          'Milestone - date': { value: 'date 2', type: 'string' },
          'Project - Name': { value: 'project 2', type: 'string' }
        },
      ]);
    });
  });

  describe('#exportProjectsMilestones', () => {
    it('gets all metrics and creats an object', async () => {
      const entities = [{ data: 'data' }];
      const entitiesWithProjects = [{ data: 'data', data1: 'data 1' }];
      sinon.stub(page, 'getEntitiesFlatStructure').resolves(entities);
      sinon.stub(page, 'mergeProjectsWithEntities').resolves(entitiesWithProjects);

      Category.findOne.resolves({
        id: 1
      });

      await page.exportProjectsMilestones(req, res);

      sinon.assert.calledWith(page.getEntitiesFlatStructure, { id: 1 });
      sinon.assert.calledWith(page.mergeProjectsWithEntities, entities);
      sinon.assert.calledWith(res.json, entitiesWithProjects);
    });
  });
});
