const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const Entity = require('models/entity');
const Category = require('models/category');

let page = {};
let res = {};
let req = {};

describe('pages/tableau-export/TableauExport', () => {
  beforeEach(() => {
    const TableauExport = require('pages/tableau-export/TableauExport');

    req = { params: { type: 'metrics' } };

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

  describe('#exportingMetrics', () => {
    it('returns correct url', () => {
      expect(page.exportingMetrics).to.be.ok;
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

  describe('#getMetrics', () => {
    it('gets all metrics and creats an object', async () => {
      Category.findOne.resolves({
        id: 1
      });

      Entity.findAll.resolves([{
        entityFieldEntries: [{
          categoryField: {
            displayName: 'name'
          },
          value: 'some name'
        }],
        parents: []
      },{
        entityFieldEntries: [{
          categoryField: {
            displayName: 'name'
          },
          value: 'some name'
        }],
        parents: []
      }]);

      const entites = await page.getMetrics();

      expect(entites).to.eql([ { name: 'some name' }, { name: 'some name' } ])
    });
  });

  describe('#exportMetrics', () => {
    it('returns data as csv', async () => {
      const data = { test: 'test1' };
      sinon.stub(page, 'getMetrics').resolves(data);

      res = {
        set: sinon.stub(),
        attachment: sinon.stub(),
        status: sinon.stub(),
        send: sinon.stub()
      };

      await page.exportMetrics(req, res);

      sinon.assert.calledWith(res.set, 'Cache-Control', 'public, max-age=0')
      sinon.assert.calledWith(res.attachment, 'metrics.csv');
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.send, `"test"
"test1"`);

    });
  });
});
