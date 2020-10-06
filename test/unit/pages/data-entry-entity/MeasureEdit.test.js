const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const rayg = require('helpers/rayg');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const { Op } = require('sequelize');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-edit/MeasureEdit', () => {
  beforeEach(() => {
    const MeasureEdit = require('pages/data-entry-entity/measure-edit/MeasureEdit');

    res = { cookies: sinon.stub(), redirect: sinon.stub(),  sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { cookies: [], params: { metricId: 'measure-1' }, user: { roles: [] } };
    res.status.returns(res);

    page = new MeasureEdit('edit-measure', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(entityUserPermissions, 'assignEntityIdsUserCanAccessToLocals');
  });

  afterEach(() => {
    authentication.protect.restore();
    entityUserPermissions.assignEntityIdsUserCanAccessToLocals.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureEdit);
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
    it('responds with method not allowed if not admin and no entitiesUserCanAccess', async () => {
      page.res.locals.entitiesUserCanAccess = [];

      await page.getRequest(req, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });
  });

  describe('#getEntityFields', () => {
    it('gets entity fields', async () => {
      const entityFieldEntries = [{ entityfieldEntry: { value: 'new value', categoryField: { name: 'test' } } }];
      EntityFieldEntry.findAll.resolves(entityFieldEntries);

      const response = await page.getEntityFields('measure-1');

      expect(response).to.eql(entityFieldEntries);
    });

    it('returns error when no entity fields data ', async () => {
      EntityFieldEntry.findAll.resolves();

      let error = {};
      try {
        await page.getEntityFields('measure-1');
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('EntityFieldEntry export, error finding entityFieldEntries');
    });
  });

  describe('#getMeasureCategory', () => {
    it('gets and returns category', async () => {
      const category = { name: 'some-name' };
      Category.findOne.resolves(category);

      const response = await page.getCategory();

      expect(response).to.eql(category);
    });

    it('gets and returns category', async () => {
      Category.findOne.resolves();

      let error = {};
      try {
        await page.getCategory();
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Category export, error finding Measure category');
    });
  });

  describe('#getMeasureEntities', () => {
    const entities = {
      id: 'some-id',
      publicId: 'some-public-id-1',
    };
    const categoryId = 1;
    const entityFieldEntries = [{ entityfieldEntry: { value: 'new value', categoryField: { name: 'test' } } }];

    beforeEach(() => {
      sinon.stub(page, 'getEntityFields').returns(entityFieldEntries)
      Entity.findAll.returns([entities]);
    });

    afterEach(() => {
      page.getEntityFields.restore();
    });

    it('gets entities for a given category if admin', async () => {
      page.req.user.roles.push({ name: 'admin' });

      
      const response = await page.getMeasureEntities(categoryId);

      expect(response).to.eql([{
        id: 'some-id',
        publicId: 'some-public-id-1',
        entityFieldEntries,
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: { categoryId },
        order: [['created_at', 'DESC']],
        include: [{
          model: EntityFieldEntry,
          where: { value: req.params.metricId },
          include: {
            model: CategoryField,
            where: { name: 'metricId' },
          }
        },{
          model: Entity,
          as: 'parents',
          include: [{
            model: Category
          }, {
            model: Entity,
            as: 'parents',
            include: Category
          }]
        }]
      });
    });

    it('gets entities for a given category if not admin', async () => {
      page.res.locals.entitiesUserCanAccess = [{
        id: 10
      }];

      const response = await page.getMeasureEntities(categoryId);
      expect(response).to.eql([{
        id: 'some-id',
        publicId: 'some-public-id-1',
        entityFieldEntries,
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: {
          categoryId, 
          id: {
            [Op.in]: [10]
          }
        },
        order: [['created_at', 'DESC']],
        include: [{
          model: EntityFieldEntry,
          where: { value: req.params.metricId },
          include: {
            model: CategoryField,
            where: { name: 'metricId' },
          }
        },{
          model: Entity,
          as: 'parents',
          include: [{
            model: Category
          }, {
            model: Entity,
            as: 'parents',
            include: Category
          }]
        }]
      });
    });
  });

  describe('#getMeasure', () => {
    const measureCategory = { id: 'some-category' };
    const measureEntities = [{ id: 'new-id', publicId: 'pubId', parents: [], entityFieldEntries: [{ categoryField: { name: 'test' }, value: 'new value' }] }];
    const themeEntities = [{ id: 'some-entity' }];

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(measureCategory);  
      sinon.stub(page, 'getMeasureTheme').returns(themeEntities);
      sinon.stub(rayg, 'getRaygColour')
    });

    afterEach(() => {
      page.getCategory.restore();
      page.getMeasureEntities.restore();
      page.getMeasureTheme.restore();
      rayg.getRaygColour.restore();
    });

    it('Get measures and applying rayg', async () => {
      sinon.stub(page, 'getMeasureEntities').returns(measureEntities);

      await page.getMeasure();

      sinon.assert.calledOnce(page.getCategory);
      sinon.assert.calledWith(page.getMeasureEntities, measureCategory.id);
      sinon.assert.calledWith(page.getMeasureTheme, measureEntities[0].parents);
      sinon.assert.calledOnce(rayg.getRaygColour);
    });

    it('redirects to list if no entity data', async () => {
      sinon.stub(page, 'getMeasureEntities').returns([]);
      await page.getMeasure();

      sinon.assert.calledOnce(page.getCategory);
      sinon.assert.calledWith(page.getMeasureEntities, measureCategory.id);
      sinon.assert.calledWith(res.redirect, paths.dataEntryEntity.measureList);
    });
  });

  describe('#getMeasureTheme', () => {
    it('gets theme data', async () => {
      const categories = [{ id: 1, name: 'Theme' }, { id: 2, name: 'Statement' }];
      const entityFields =  [{ categoryField: { name: 'name' }, value: 'new-value' }];

      Category.findAll.resolves(categories);
      sinon.stub(page, 'getEntityFields').returns(entityFields);

      const themeParents = [{ id: 456, categoryId: 1 }]
      const statementParents = [{ categoryId: 2, parents: themeParents }]
      const response = await page.getMeasureTheme(statementParents);

      sinon.assert.calledWith(page.getEntityFields, themeParents[0].id);
      expect(response).to.eql({
        id: 456,
        name: 'new-value',
      });
    });

    it('return error if statement id not set in parents object', async () => {
      const categories = [{ id: 1, name: 'Theme' }, { id: 2, name: 'Statement' }];
      Category.findAll.resolves(categories);
      
      let error = {};
      try {
        const parents = [{ categoryId: 3 }]
        await page.getMeasureTheme(parents);
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('No parent statement found');
    });
  });
});