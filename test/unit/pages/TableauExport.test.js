const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const Entity = require('models/entity');
const Category = require('models/category');
const proxyquire = require('proxyquire');

let page = {};
let res = {};
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
      expect(page.pathToBind).to.eql(`${paths.tableauExport}/:type`);
    });
  });

  describe('#exportingMeasures', () => {
    it('returns correct url', () => {
      page.req = { params: { type: 'measures' } };
      expect(page.exportingMeasures).to.be.ok;
    });
  });

  describe('#exportingProjects', () => {
    it('returns correct url', () => {
      page.req = { params: { type: 'projects' } };
      expect(page.exportingProjects).to.be.ok;
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
            name: 'name'
          },
          value: 'Some name'
        }],
        category: {
          name: 'Category name'
        },
        parents: []
      });

      await page.addParents(entity, entityObject);

      expect(entityObject).to.eql({ ['Category name']: 'Some name' });
    });
  });

  describe('#getEntitiesFlatStructure', () => {
    it('gets entites with a flat structure', async () => {
      sinon.stub(page, 'addParents').resolves();

      Entity.findAll.resolves([{
        publicId: '1',
        entityFieldEntries: [{
          categoryField: {
            displayName: 'name'
          },
          value: 'some name'
        }],
        parents: []
      },{
        publicId: '1',
        entityFieldEntries: [{
          categoryField: {
            displayName: 'name'
          },
          value: 'some name'
        }],
        parents: []
      }]);

      const entityObjects = await page.getEntitiesFlatStructure({ id: 1 });

      expect(entityObjects).to.eql([
        { name: 'some name', 'Public ID': '1' },
        { name: 'some name', 'Public ID': '1' }
      ]);
    });
  });

  describe('#exportMeasures', () => {
    it('gets all metrics and creats an object', async () => {
      const resp = { data: 'data' };
      sinon.stub(page, 'getEntitiesFlatStructure').resolves(resp);
      sinon.stub(page, 'responseAsCSV');

      Category.findOne.resolves({
        id: 1
      });

      await page.exportMeasures(req, res);

      sinon.assert.calledWith(page.getEntitiesFlatStructure, { id: 1 });
      sinon.assert.calledWith(page.responseAsCSV, resp, res);
    });
  });

  describe('#mergeProjectsWithEntities', () => {
    it('get projects and merge with project entities', async () => {
      const entities = [{
        'Public ID': 1
      },{
        'Public ID': 2
      }];

      const projects = [{
        uid: 1,
        name: 'project 1',
        projectFieldEntries: [{
          projectField: {
            displayName: 'UID'
          },
          value: 'UID 1'
        }]
      },{
        uid: 2,
        name: 'project 2',
        projectFieldEntries: [{
          projectField: {
            displayName: 'UID'
          },
          value: 'UID 2'
        }]
      }];
      getAllDataStub.resolves(projects);

      const mergedEntities = await page.mergeProjectsWithEntities(entities);
      expect(mergedEntities).to.eql([
        { 'Public ID': 1, 'Project UID': 'UID 1' },
        { 'Public ID': 2, 'Project UID': 'UID 2' }
      ]);
    });
  });

  describe('#exportProjects', () => {
    it('gets all metrics and creats an object', async () => {
      const entities = [{ data: 'data' }];
      const entitiesWithProjects = [{ data: 'data', data1: 'data 1' }];
      sinon.stub(page, 'getEntitiesFlatStructure').resolves(entities);
      sinon.stub(page, 'mergeProjectsWithEntities').resolves(entitiesWithProjects);
      sinon.stub(page, 'responseAsCSV');

      Category.findOne.resolves({
        id: 1
      });

      await page.exportProjects(req, res);

      sinon.assert.calledWith(page.getEntitiesFlatStructure, { id: 1 });
      sinon.assert.calledWith(page.mergeProjectsWithEntities, entities);
      sinon.assert.calledWith(page.responseAsCSV, entitiesWithProjects, res);
    });
  });
});
