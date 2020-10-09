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
const flash = require('middleware/flash');

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

  describe('#successfulMode', () => {
    it('returns true when in successful mode', () => {
      page.req.params = { metricId: '123', successful: 'successful' };
      expect(page.successfulMode).to.be.ok;
    });

    it('returns false when not in successful mode', () => {
      expect(page.successfulMode).to.be.not.ok;
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader']),
        flash,
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

  describe('#getCategory', () => {
    it('gets and returns category', async () => {
      const category = { name: 'Theme' };
      Category.findOne.resolves(category);

      const response = await page.getCategory('Theme');

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
      parents: [
        {
          parents: [ {
            categoryId: 1,
            entityFieldEntries: [{
              categoryField: {
                name: 'name',
              },
              value: 'borders'
            }]
          }]
        }
      ]
    };
    const category = { id: 2 };
    const theme = { id: 1 };
    const entityFieldEntries = [{ value: 'new value', categoryField: { name: 'test' } }];

    beforeEach(() => {
      sinon.stub(page, 'getEntityFields').returns(entityFieldEntries)
      Entity.findAll.returns([entities]);
      sinon.stub(rayg, 'getRaygColour').returns('green')
    });

    afterEach(() => {
      page.getEntityFields.restore();
      rayg.getRaygColour.restore();
    });

    it('gets entities for a given category if admin', async () => {
      page.req.user.roles.push({ name: 'admin' });
      const response = await page.getMeasureEntities(category, theme);

      expect(response).to.eql([{
        id: 'some-id',
        publicId: 'some-public-id-1',
        colour: 'green',
        theme: 'borders',
        test: 'new value',
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: { categoryId: category.id },
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

      const response = await page.getMeasureEntities(category, theme);
      expect(response).to.eql([{
        id: 'some-id',
        publicId: 'some-public-id-1',
        colour: 'green',
        theme: 'borders',
        test: 'new value',
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: {
          categoryId: category.id,
          id: {
            [Op.in]: [10]
          }
        },
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

  describe('#getMeasure', () => {
    const measureCategory = { id: 'some-category' };
    const measureEntities = [{ id: 'new-id', publicId: 'pubId', parents: [], entityFieldEntries: [{ categoryField: { name: 'test' }, value: 'new value' }] }];

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(measureCategory);  
    });

    afterEach(() => {
      page.getCategory.restore();
      page.getMeasureEntities.restore();
    });

    it('Get measures and applying rayg', async () => {
      sinon.stub(page, 'getMeasureEntities').returns(measureEntities);

      await page.getMeasure();

      sinon.assert.calledTwice(page.getCategory);
      sinon.assert.calledOnce(page.getMeasureEntities);
    });

    it('redirects to list if no entity data', async () => {
      sinon.stub(page, 'getMeasureEntities').returns([]);
      await page.getMeasure();

      sinon.assert.calledTwice(page.getCategory);
      sinon.assert.calledOnce(page.getMeasureEntities);
      sinon.assert.calledWith(res.redirect, paths.dataEntryEntity.measureList);
    });
  });

  describe('#applyFilterLabel', () => {
    it('Should create label with filtervalue and filtervalue2 when both filter and filter2 exist', async () => {
      const measures = [{ filter: 'filter1', filterValue: 'value1', filter2: 'filter2', filterValue2: 'value2' }];
      page.applyFilterLabel(measures);
      expect(measures[0].label).to.eql('value1 - value2');
    });

    it('Should create label with filtervalue if only filter exists', async () => {
      const measures = [{ filter: 'filter1', filterValue: 'value1' }];
      page.applyFilterLabel(measures);
      expect(measures[0].label).to.eql('value1');
    });

    it('Should not create label when there are no filters', async () => {
      const measures = [{ other: 'other values', }];
      page.applyFilterLabel(measures);
      expect(measures[0].label).not.to.exist;
    });
  });

  describe('#sortMeasureData', () => {
    it('Should sort data by date and filter', async () => {
      const entity1 = { filterValue: 'value1', date: '04/10/2020' };
      const entity2 = { filterValue: 'value2', date: '05/10/2020' };
      const measures = [entity1, entity2];
      const response = page.sortMeasureData(measures);

      expect(response).to.eql({
        [entity1.date]: {
          [entity1.filterValue]: [entity1]
        },
        [entity2.date]: {
          [entity2.filterValue]: [entity2]
        }
      });
    });

    it('Should sort data by date and metricID when filter does not exist', async () => {
      const entity1 = { metricID: 'metric1', date: '04/10/2020' };
      const entity2 = { metricID: 'metric1', date: '05/10/2020' };
      const measures = [entity1, entity2];
      const response = page.sortMeasureData(measures);

      expect(response).to.eql({
        [entity1.date]: {
          [entity1.metricID]: [entity1]
        },
        [entity2.date]: {
          [entity2.metricID]: [entity2]
        }
      });
    });
  });
  
  describe('#getMeasureData', () => {
    const measureEntities = [{ metricID: 'metric1', date: '05/10/2020', value: 2 }, { metricID: 'metric1', date: '04/10/2020', value: 1 }];

    beforeEach(() => {
      sinon.stub(page, 'getMeasure').returns(measureEntities);  
      sinon.stub(page, 'sortMeasureData').returns({});  
    });

    afterEach(() => {
      page.getMeasure.restore();
      page.sortMeasureData.restore();
    });

    it('getMeasureData should call getMeasure and sortMeasureData', async () => {
      await page.getMeasureData();
      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledWith(page.sortMeasureData, measureEntities);
    });
  });

  describe('#getEntitiesToBeCloned', () => {
    const entities = {
      id: 123,
      publicId: 'some-public-id-1',
      entityFieldEntries: [{ 
        value: 'new value',
        categoryField: { 
          name: 'test'
        }
      }],
      parents: [
        {
          categoryId: 2,
          publicId: 'stat-1',
          entityFieldEntries: [{
            categoryField: {
              name: 'name',
            },
            value: 'test'
          }]
        }
      ]
    };
    const statementCategory = { id: 2 };
    const entityIds = [123]

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(statementCategory)
      Entity.findAll.returns([entities]);
    });

    afterEach(() => {
      page.getCategory.restore();
    });

    it('gets entities to be cloned if admin', async () => {
      page.req.user.roles.push({ name: 'admin' });
      const response = await page.getEntitiesToBeCloned(entityIds);

      expect(response).to.eql([{
        id: 123,
        parentStatementPublicId: 'stat-1',
        test: 'new value',
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        where: { id: entityIds },
        include: [{
          model: EntityFieldEntry,
          include: CategoryField
        },{
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
      });
    });

    it('throw error when non-admin doesnt have correct access to all entities', async () => {
      page.res.locals.entitiesUserCanAccess = [{ id: 123 }];
      const entityIds = [123, 456]

      let error = {};
      try {
        await page.getEntitiesToBeCloned(entityIds);
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Permissions error, user does not have access to all entities');
    });
  });

  describe('#CreateEntitiesFromClonedData', () => {
    const entities = [{
      id: 123,
      publicId: 'some-public-id-1',
      value: 10
    }];
    const formData = { day: 1, month: 10, year: 2020, type: 'entries', entities: { 123: 100 }};

    it('should return the correct data structure', async () => {
      const response = await page.CreateEntitiesFromClonedData(entities, formData);

      expect(response).to.eql([{
        publicId: 'some-public-id-1',
        date: '2020-10-01',
        value: 100
      }]);
    });
  });

  
});