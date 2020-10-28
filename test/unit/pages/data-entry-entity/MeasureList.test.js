const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const config = require('config');
const MeasureList = require('pages/data-entry-entity/measure-list/MeasureList');
const authentication = require('services/authentication');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const CategoryField = require('models/categoryField');
const filterMetrics = require('helpers/filterMetrics');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-list/MeasureList', () => {
  beforeEach(() => {

    res = { cookies: sinon.stub(), sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { cookies: [], query: { category: 'category' }, user: { roles: [], getPermittedMetricMap: sinon.stub().returns({}) } };
    res.status.returns(res);

    page = new MeasureList('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(filterMetrics,'filterMetrics').returnsArg(1);
  });

  afterEach(() => {
    authentication.protect.restore();
    filterMetrics.filterMetrics.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureList);
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader'])
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader']);
    });
  });

  describe('#getCategory', () => {
    it('gets and returns category', async () => {
      const category = { name: 'some-name' };
      Category.findOne.resolves(category);

      const response = await page.getCategory('some-name');

      expect(response).to.eql(category);
    });

    it('gets and returns category', async () => {
      Category.findOne.resolves();

      let error = {};
      try {
        await page.getCategory('some-name');
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Category export, error finding some-name category');
    });
  });

  describe('#getMeasureEntities', () => {
    const entities = [{
      id: 'some-id',
      publicId: 'some-public-id-1',
      entityFieldEntries: [{
        categoryField: { name: 'name' },
        value: 'some name'
      }],
      parents: [{
        parents: [{
          categoryId: 1,
          entityFieldEntries: [{
            categoryField: { name: 'name' },
            value: 'theme name'
          }]
        }]
      }]
    },{
      id: 'some-id',
      publicId: 'some-public-id-2',
      entityFieldEntries: [{
        categoryField: { name: 'name' },
        value: 'some name'
      },{
        categoryField: { name: 'filter' },
        value: 'RAYG'
      }],
      parents: [{
        parents: [{
          categoryId: 1,
          entityFieldEntries: [{
            categoryField: { name: 'name' },
            value: 'theme name'
          }]
        }]
      }]
    }];
    const category = { id: 1 };

    beforeEach(() => {
      Entity.findAll.returns(entities);
    });

    it('gets entities for a given category if admin', async () => {
      page.req.user.roles.push({ name: 'admin' });
      page.req.user.isAdmin = true;

      const response = await page.getMeasureEntities(category, category);
      expect(response).to.eql([{
        id: "some-id",
        name: "some name",
        publicId: "some-public-id-1",
        theme: "theme name"
      },{
        filter: "RAYG",
        id: "some-id",
        name: "some name",
        publicId: "some-public-id-2",
        theme: "theme name"
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: { categoryId: category.id },
        include: [{
          separate: true,
          model: EntityFieldEntry,
          include: CategoryField
        },{
          model: Entity,
          as: 'parents',
          include: [{
            model: Category
          }, {
            model: Entity,
            as: 'parents',
            include: [{
              separate: true,
              model: EntityFieldEntry,
              include: CategoryField
            }, {
              model: Category
            }]
          }]
        }]
      });
    });
  });

  describe('#groupMeasures', () => {
    const measures = [{
      id: "some-id",
      name: "some name",
      publicId: "some-public-id-1",
      theme: "theme name",
      groupID: 'Group 1',
      redThreshold: 1,
      aYThreshold: 2,
      greenThreshold: 3,
      value: 1
    },{
      filter: "RAYG",
      id: "some-id",
      name: "some name",
      publicId: "some-public-id-2",
      theme: "theme name",
      groupID: 'Group 1',
      redThreshold: 1,
      aYThreshold: 2,
      greenThreshold: 3,
      value: 1
    }];

    it('groups measures by rayg row, sets rayg colour', () => {
      const measureGroups = page.groupMeasures(measures);
      expect(measureGroups).to.eql([{
        aYThreshold: 2,
        children: [
          {
            aYThreshold: 2,
            colour: "red",
            greenThreshold: 3,
            groupID: "Group 1",
            id: "some-id",
            name: "some name",
            publicId: "some-public-id-1",
            redThreshold: 1,
            theme: "theme name",
            value: 1
          }
        ],
        colour: "red",
        filter: "RAYG",
        greenThreshold: 3,
        groupID: "Group 1",
        id: "some-id",
        name: "some name",
        publicId: "some-public-id-2",
        redThreshold: 1,
        theme: "theme name",
        value: 1
      }]);
    })
  });

  describe('#getMeasures', () => {
    const category = { id: 'some-category' };
    const measureEntities = [{ id: 'some-entity' }];
    const measureEntitiesGrouped = [{
      id: 'some-entity',
      children: [{
        id: 'some-entity-1'
      },{
        id: 'some-entity-2'
      }]
    },{
      id: 'some-entity',
      children: [{
        id: 'some-entity-1'
      }]
    }];

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(category);
      sinon.stub(page, 'getMeasureEntities').returns(measureEntities);
      sinon.stub(page, 'groupMeasures').returns(measureEntitiesGrouped);
    });

    it('orchastrates getting measures and applying rayg colours', async () => {
      const measures = await page.getMeasures();

      sinon.assert.calledWith(page.getCategory, 'Measure');
      sinon.assert.calledWith(page.getCategory, 'Theme');
      sinon.assert.calledWith(page.getMeasureEntities, category, category);
      sinon.assert.calledWith(page.groupMeasures, measureEntities);

      expect(measures).to.eql({
        grouped: [measureEntitiesGrouped[0]],
        notGrouped: [measureEntitiesGrouped[1]],
      });
    });
  });

  describe('#isEnabled', () => {
    let sandbox = {};
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be enabled if measureUpload feature is active', () => {
      sandbox.stub(config, 'features').value({
        measureUpload: true
      });

      expect(MeasureList.isEnabled).to.be.ok;
    });

    it('should be enabled if measureUpload feature is not active', () => {
      sandbox.stub(config, 'features').value({
        measureUpload: false
      });

      expect(MeasureList.isEnabled).to.not.be.ok;
    });
  });
});
