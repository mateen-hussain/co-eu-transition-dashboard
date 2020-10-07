const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const CategoryField = require('models/categoryField');
const { Op } = require('sequelize');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-list/MeasureList', () => {
  beforeEach(() => {
    const MeasureList = require('pages/data-entry-entity/measure-list/MeasureList');

    res = { cookies: sinon.stub(), sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { cookies: [], query: { category: 'category' }, user: { roles: [] } };
    res.status.returns(res);

    page = new MeasureList('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(entityUserPermissions, 'assignEntityIdsUserCanAccessToLocals');
  });

  afterEach(() => {
    authentication.protect.restore();
    entityUserPermissions.assignEntityIdsUserCanAccessToLocals.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureList);
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader']),
        entityUserPermissions.assignEntityIdsUserCanAccessToLocals
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader']);
    });
  });

  describe('#getRequest', () => {
    it('responeds with metho not allowed if not admin and no entitiesUserCanAccess', async () => {
      page.res.locals.entitiesUserCanAccess = [];

      await page.getRequest(req, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
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

      const response = await page.getMeasureEntities(category, category);
      expect(response).to.eql([{
        id: "some-id",
        name: "some name",
        publicId: "some-public-id-1",
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

    it('gets entities for a given category if not admin', async () => {
      page.res.locals.entitiesUserCanAccess = [{
        id: 10
      }];

      const response = await page.getMeasureEntities(category, category);
      expect(response).to.eql([{
        id: "some-id",
        name: "some name",
        publicId: "some-public-id-1",
        theme: "theme name"
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: {
          categoryId: category.id,
          id: {
            [Op.in]: [10]
          }
        },
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

  describe('#getMeasures', () => {
    const category = { id: 'some-category' };
    const measureEntities = [{ id: 'some-entity' }];
    const latestMeasures = [{ id: 'some-entity' }];

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(category);
      sinon.stub(page, 'getMeasureEntities').returns(measureEntities);
      sinon.stub(page, 'latestMeasures').returns(latestMeasures);
      sinon.stub(page, 'getRaygColour');
    });

    it('orchastrates getting measures and applying rayg colours', async () => {
      await page.getMeasures();

      sinon.assert.calledWith(page.getCategory, 'Measure');
      sinon.assert.calledWith(page.getCategory, 'Theme');
      sinon.assert.calledWith(page.getMeasureEntities, category, category);
      sinon.assert.calledWith(page.latestMeasures, measureEntities);
      sinon.assert.calledWith(page.getRaygColour, latestMeasures[0]);
    });
  });
});
