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
const parse = require('helpers/parse');
const validation = require('helpers/validation');
const sequelize = require('services/sequelize');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-edit/MeasureEdit', () => {
  beforeEach(() => {
    const MeasureEdit = require('pages/data-entry-entity/measure-edit/MeasureEdit');

    res = { cookies: sinon.stub(), redirect: sinon.stub(),  sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { body: {}, cookies: [], params: { metricId: 'measure-1' }, user: { roles: [] }, flash: sinon.stub() };
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

  describe('#applyLabelToEntities', () => {
    it('Should create label with filtervalue and filtervalue2 when both filter and filter2 exist', async () => {
      const measures = [{ filter: 'filter1', filterValue: 'value1', filter2: 'filter2', filterValue2: 'value2' }];
      page.applyLabelToEntities(measures);
      expect(measures[0].label).to.eql('value1 - value2');
    });

    it('Should create label with filtervalue if only filter exists', async () => {
      const measures = [{ filter: 'filter1', filterValue: 'value1' }];
      page.applyLabelToEntities(measures);
      expect(measures[0].label).to.eql('value1');
    });

    it('Should not create label when there are no filters', async () => {
      const measures = [{ other: 'other values', }];
      page.applyLabelToEntities(measures);
      expect(measures[0].label).not.to.exist;
    });
  });

  describe('#groupEntitiesByDateAndFilter', () => {
    it('Should sort data by date and filter', async () => {
      const entity1 = { filterValue: 'value1', date: '04/10/2020' };
      const entity2 = { filterValue: 'value2', date: '05/10/2020' };
      const measures = [entity1, entity2];
      const response = page.groupEntitiesByDateAndFilter(measures);

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
      const response = page.groupEntitiesByDateAndFilter(measures);

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

  describe('#sortGroupedEntityData', () => {
    it('Should sort group data by filterValue and filterValue2', async () => {
      const entity1 = { filter: 'country', filter2: 'area', filterValue: 'value1', filterValue2: 'Wales' };
      const entity2 = { filter: 'country', filter2: 'area', filterValue: 'value1', filterValue2: 'England' };
      const entities = { country: [entity1, entity2] };
      const response = page.sortGroupedEntityData(entities);
      expect(response).to.eql({
        country: [entity2, entity1]
      });
    });

    it('Should sort group data by filterValue when filterValue2 is not set', async () => {
      const entity1 = { filter: 'country', filterValue: 'Wales' };
      const entity2 = { filter: 'country', filterValue: 'England' };
      const entities = { country: [entity1, entity2] };
      const response = page.sortGroupedEntityData(entities);
      expect(response).to.eql({
        country: [entity2, entity1]
      });
    });
  });

  describe('#calculateUiInputs', () => {
    it('should filter list of entities by date and return data for unique entities when filter and filter2 are set', async () => {
      const measureEntities = [
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', filter2: 'area', filterValue2: 'north', value: 10 }, 
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', filter2: 'area', filterValue2: 'north', value: 5 }, 
      ];

      const response = await page.calculateUiInputs(measureEntities);
      expect(response).to.eql([measureEntities[0]]);
    });

    it('should filter list of entities by date and return data for unique entities when only filter is set', async () => {
      const measureEntities = [
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', value: 100 }, 
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', value: 50 }, 
      ];
      const response = await page.calculateUiInputs(measureEntities);
      expect(response).to.eql([measureEntities[0]]);
    });

    it('should filter list of entities by date and return data for unique entities when neither filter or filter2 is set', async () => {
      const measureEntities = [
        { metricID: 'metric1', date: '05/10/2020', value: 20 }, 
        { metricID: 'metric1', date: '05/10/2020', value: 10 }, 
      ];
      const response = await page.calculateUiInputs(measureEntities);
      expect(response).to.eql([measureEntities[0]]);
    });
  });
  
  describe('#getMeasureData', () => {
    const measureEntities = [{ metricID: 'metric1', date: '05/10/2020', value: 2 }, { metricID: 'metric1', date: '04/10/2020', value: 1 }];

    beforeEach(() => {
      sinon.stub(page, 'getMeasure').returns(measureEntities);  
      sinon.stub(page, 'groupEntitiesByDateAndFilter').returns({});  
    });

    afterEach(() => {
      page.getMeasure.restore();
      page.groupEntitiesByDateAndFilter.restore();
    });

    it('getMeasureData should call getMeasure and groupEntitiesByDateAndFilter', async () => {
      await page.getMeasureData();
      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledWith(page.groupEntitiesByDateAndFilter, measureEntities);
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
    const formData = { day: 1, month: 10, year: 2020, type: 'entries', entities: { 123: 100 } };

    it('should return the correct data structure', async () => {
      const response = await page.CreateEntitiesFromClonedData(entities, formData);

      expect(response).to.eql([{
        publicId: 'some-public-id-1',
        date: '2020-10-01',
        value: 100
      }]);
    });
  });

  describe('#validateFormData', () => {
    beforeEach(() => {
      sinon.stub(page, 'getMeasure').returns([]);  
      sinon.stub(page, 'calculateUiInputs').returns([{ id: 123 }, { id: 456 }]);  
    });

    afterEach(() => {
      page.getMeasure.restore();
      page.calculateUiInputs.restore();
    });

    it('should return an error when date is not valid', async () => {
      const formData = { day: '10', month: '14', year: '2020', entities:{} };
      
      const response = await page.validateFormData(formData);

      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledOnce(page.calculateUiInputs);
      expect(response[0]).to.eql({ error: 'Invalid date' });
    });

    it('should return an error when no entities data is present', async () => {
      const formData = { day: '10', month: '12', year: '2020' };

      const response = await page.validateFormData(formData);

      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledOnce(page.calculateUiInputs);
      expect(response[0]).to.eql({ error: 'Mssing entity values' });
    });

    it('should return an error when entities data is missing ids', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: 10 } };

      const response = await page.validateFormData(formData);

      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledOnce(page.calculateUiInputs);
      expect(response[0]).to.eql({ error: 'Mssing entity values' });
    });

    it('should return an error when entities data is empty', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: '', 456: 10 } };

      const response = await page.validateFormData(formData);

      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledOnce(page.calculateUiInputs);
      expect(response[0]).to.eql({ error: 'Invalid field value' });
    });

    it('should return an error when entities data is NaN', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: 'hello', 456: 10 } };

      const response = await page.validateFormData(formData);

      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledOnce(page.calculateUiInputs);
      expect(response[0]).to.eql({ error: 'Invalid field value' });
    });

    it('should return an empty array when data is valid', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: 5, 456: 10 } };

      const response = await page.validateFormData(formData);

      sinon.assert.calledOnce(page.getMeasure);
      sinon.assert.calledOnce(page.calculateUiInputs);
      expect(response.length).to.eql(0);
    });
  });

  describe('#validateEntities', () => {
    const categoryFields = [{ id: 1 }];

    beforeEach(() => {
      Category.fieldDefinitions = sinon.stub().returns(categoryFields);
      sinon.stub(validation, 'validateItems');
      sinon.stub(parse, 'parseItems')
    });

    afterEach(() => {
      parse.parseItems.restore();
      validation.validateItems.restore();
    });
    
    it('rejects if no entities found', async () => {
      parse.parseItems.returns([]);
      validation.validateItems.returns([])
      const response = await page.validateEntities();
      expect(response.errors).to.eql([{ error: 'No entities found' }]);
    });

    it('validates each item parsed', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const parsedItems = [{ foo: 'bar' }];
      parse.parseItems.returns(parsedItems);
      validation.validateItems.returns([])

      const response = await page.validateEntities(items);

      expect(response).to.eql({ errors: [], parsedEntities: [ { foo: 'bar' } ] });
      sinon.assert.calledWith(validation.validateItems, parsedItems, categoryFields);
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      sinon.stub(page, 'saveData')
      sinon.stub(page, 'addMeasureEntityData').returns([])
    });

    afterEach(() => {
      page.saveData.restore();
      page.addMeasureEntityData.restore();
    });
    
    it('should return method not allowed when no admin and entitiesUserCanAccess is empty', async () => {
      res.locals = {
        entitiesUserCanAccess: []
      }
      await page.postRequest({}, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });

    it('should call addMeasureEntityData when type is entries', async () => {
      req.body = { type: 'entries' }
      req.user = { isAdmin: true }

      await page.postRequest(req, res);

      sinon.assert.calledOnce(page.saveData);
      sinon.assert.calledWith(page.addMeasureEntityData, req.body);
    });

    it('should call redirect if no error and no post data', async () => {
      req.user = { isAdmin: true }

      await page.postRequest(req, res);

      sinon.assert.calledOnce(res.redirect);
    });
  });

  describe('#addMeasureEntityData', () => {
    const clonedEntities = [{ id: 1, value: 'hello' }];
    const newEntities = [{ id: 1, value: 'hello again' }];
    const errors = [{ error: 'error' }]
    const parsedEntities = [{ id: 1, value: 'parsed again' }];

    beforeEach(() => {
      sinon.stub(page, 'getEntitiesToBeCloned').returns(clonedEntities)
      sinon.stub(page, 'CreateEntitiesFromClonedData').returns(newEntities)
      sinon.stub(page, 'saveMeasureData').returns({})
    });

    afterEach(() => {
      page.validateFormData.restore();
      page.getEntitiesToBeCloned.restore();
      page.CreateEntitiesFromClonedData.restore();
      page.saveMeasureData.restore();
    });
    
    it('should call flash and redirect when missing form data', async () => {
      const formData = { day: 1,  year: 2020, type: 'entries', entities: { 123: 100 } };
      sinon.stub(page, 'validateFormData').returns([{ error: 'error' }])

      await page.addMeasureEntityData(formData);

      sinon.assert.calledWith(page.validateFormData, formData);
      sinon.assert.calledWith(req.flash, 'Missing / invalid form data');
    });

    it('should call flash and redirect when validateEntities returns errors', async () => {
      sinon.stub(page, 'validateFormData').returns([])
      sinon.stub(page, 'validateEntities').returns({ errors, parsedEntities })
      const formData = { day: 1, month: 2, year: 2020, type: 'entries', entities: { 123: 100 } };

      await page.addMeasureEntityData(formData);

      sinon.assert.calledWith(req.flash, 'Error in entity data');
      sinon.assert.calledOnce(res.redirect);
    });

    it('should call saveMeasureData with parsedEntities data', async () => {
      sinon.stub(page, 'validateFormData').returns([])
      sinon.stub(page, 'validateEntities').returns({ errors: [], parsedEntities })
      const formData = { day: 1, month: 2, year: 2020, type: 'entries', entities: { 123: 100 } };

      await page.addMeasureEntityData(formData);

      sinon.assert.calledWith(page.getEntitiesToBeCloned, ["123"]);
      sinon.assert.calledWith(page.CreateEntitiesFromClonedData, clonedEntities, formData);
      sinon.assert.calledWith(page.validateEntities, newEntities);
      sinon.assert.calledWith(page.saveMeasureData, parsedEntities);
    });
  });

  describe('#saveMeasureData', () => {
    const categoryFields = [{ id: 1 }];
    const category = { name: 'Measure' };
    const entities  = [{ id: 1, value: 'some-value' }];

    beforeEach(() => {
      Category.fieldDefinitions = sinon.stub().returns(categoryFields);
      Category.findOne.resolves(category);
    });
  
    it('save entities to the database', async () => {
      const transaction = {
        commit: sinon.stub(),
        rollback: sinon.stub()
      };
      sequelize.transaction.returns(transaction);
      page.clearData = sinon.stub();

      Entity.import = sinon.stub();

      await page.saveMeasureData(entities);

      sinon.assert.calledWith(Entity.import, entities[0], category, categoryFields, { transaction });
      sinon.assert.calledOnce(transaction.commit);
      sinon.assert.calledOnce(page.clearData);
      sinon.assert.calledWith(page.res.redirect, `${page.url}/${req.params.metricId}/successful`);
    });

    it('rollback transaction on error', async () => {
      const transaction = {
        commit: sinon.stub(),
        rollback: sinon.stub()
      };
      sequelize.transaction.returns(transaction);

      Entity.import = sinon.stub().throws(new Error('error'));

      await page.saveMeasureData(entities);

      sinon.assert.calledWith(page.res.redirect, `${page.url}/${req.params.metricId}`);
      sinon.assert.calledOnce(transaction.rollback);
    });
  });
});