const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const MeasureValue = require('pages/data-entry-entity/measure-value/MeasureValue');
const authentication = require('services/authentication');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const measures = require('helpers/measures')
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const sequelize = require('services/sequelize');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-value/MeasureValue', () => {
  beforeEach(() => {

    res = { cookies: sinon.stub(), redirect: sinon.stub(), render: sinon.stub(),   sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { body: {}, cookies: [], params: { groupId: 'measure-1', metricId: 'measure-1', date: '12/10/2020' }, user: { roles: [], getPermittedMetricMap: sinon.stub().returns({}) }, flash: sinon.stub() };
    res.status.returns(res);

    page = new MeasureValue('edit-value', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(entityUserPermissions, 'assignEntityIdsUserCanAccessToLocals');
  });

  afterEach(() => {
    authentication.protect.restore();
    entityUserPermissions.assignEntityIdsUserCanAccessToLocals.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureValue);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url', () => {
      expect(page.pathToBind).to.eql(`${paths.dataEntryEntity.measureValue}/:metricId/:groupId/:date/:successful?`);
    });
  });

  describe('#editUrl', () => {
    it('returns url for edit measure value', () => {
      const { metricId, groupId, date } = req.params;
      expect(page.editUrl).to.eql(`${page.url}/${metricId}/${groupId}/${encodeURIComponent(date)}`);
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

  describe('#getRequest', () => {
    it('responds with method not allowed if not admin and no entitiesUserCanAccess', async () => {
      page.res.locals.entitiesUserCanAccess = [];

      await page.getRequest(req, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });
  });

  describe('#getGroupEntities', () => {
    const entities = {
      id: 'some-id',
      publicId: 'some-public-id-1',
      parents: [
        {
          publicId: 'parent-1',
          categoryId: 1,
        }
      ]
    };
    const category = { id: 2 };
    const entityFieldEntries = [{ value: 'new value', categoryField: { name: 'test' } }];
    const statementCategory = { id: 1 };

    beforeEach(() => {
      sinon.stub(measures, 'getCategory').returns(statementCategory)
      sinon.stub(measures, 'getEntityFields').returns(entityFieldEntries)
      Entity.findAll.returns([entities]);
    });

    afterEach(() => {
      measures.getEntityFields.restore();
      measures.getCategory.restore();
    });

    it('gets entities for a given category if admin', async () => {
      req.user = { isAdmin: true, getPermittedMetricMap: sinon.stub().returns({}) }

      const response = await page.getGroupEntities(category);

      expect(response).to.eql({ 
        groupEntities: [{
          id: 'some-id',
          parentStatementPublicId: 'parent-1',
          publicId: 'some-public-id-1',
          test: 'new value',
        }],
        raygEntities: []
      });

      sinon.assert.calledWith(Entity.findAll, {
        where: { categoryId: category.id },
        include: [{
          model: EntityFieldEntry,
          where: { value: req.params.groupId },
          include: {
            model: CategoryField,
            where: { name: 'groupId' },
          }
        },{
          model: Entity,
          as: 'parents',
          include: [{
            model: Category
          }]
        }]
      });
    });
  });

  describe('#getMeasure', () => {
    const measureCategory = { id: 'some-category' };
    const measureEntities = {
      groupEntities : [{ metricID: 'measure-1', id: 'new-id', publicId: 'pubId', parents: [], entityFieldEntries: [{ categoryField: { name: 'test' }, value: 'new value' }] }],
      raygEntities: [{ publicId: 'rayg1', filter: 'RAYG' }]
    };

    beforeEach(() => {
      sinon.stub(measures, 'getCategory').returns(measureCategory);
      sinon.stub(page, 'getGroupEntities').returns({ groupEntities: [], raygEntities: [] });
    });

    afterEach(() => {
      measures.getCategory.restore();
      page.getGroupEntities.restore();
    });

    it('Get measures data', async () => {
      page.getGroupEntities.returns(measureEntities);

      const response = await page.getMeasure();

      sinon.assert.calledOnce(measures.getCategory);
      sinon.assert.calledOnce(page.getGroupEntities);

      expect(response).to.eql({
        measureEntities: measureEntities.groupEntities,
        raygEntities: measureEntities.raygEntities,
        uniqMetricIds: ['measure-1']
      });
    });

    it('redirects to list if no entity data', async () => {
      await page.getMeasure();

      sinon.assert.calledOnce(measures.getCategory);
      sinon.assert.calledOnce(page.getGroupEntities);
      sinon.assert.calledWith(res.redirect, paths.dataEntryEntity.measureList);
    });
  });

  describe('#getPublicIdFromExistingEntity', () => {
    const measureEntities = [
      { id: '123', value: 'value 1', label: 'test', label2: 'test2' }, 
      { id: '456', value: 'value 2', label: 'test2' },
      { id: '789', value: 'value 3' }
    ];
      
    it('should return publicId for entitiy when label and label2 are set and match' , async () => {
      const entitiesForSelectedDate = [{ id: '456', publicId: 'test-1',  label: 'test', label2: 'test2' }]
      const response =  page.getPublicIdFromExistingEntity(measureEntities, entitiesForSelectedDate)

      expect(response).to.eql('test-1');
    });

    it('should return publicId for entitiy when label are set and match and label2 is not' , async () => {
      const entitiesForSelectedDate = [{ id: '678', publicId: 'test-2', label: 'test' }]
      const response =  page.getPublicIdFromExistingEntity(measureEntities, entitiesForSelectedDate)

      expect(response).to.eql('test-2');
    });

    it('should return publicId for entitiy when label is set and label2 is not' , async () => {
      const entitiesForSelectedDate = [{ id: '890', publicId: 'test-3' }]
      const response =  page.getPublicIdFromExistingEntity(measureEntities, entitiesForSelectedDate)

      expect(response).to.eql('test-3');
    });
  });

  describe('#createEntitiesFromClonedData', () => {
    const entities = [{
      id: 123,
      publicId: 'some-public-id-1',
      value: 10,
    }];
    const formData = { day: 1, month: 10, year: 2020, type: 'entries', entities: { 123: 100 } };
    const entitiesForSelectedDate = [{ id: '890', publicId: 'test-3' }]

    it('should return the correct data structure', async () => {
      
      const response = await page.createEntitiesFromClonedData(entities, formData, entitiesForSelectedDate);

      expect(response).to.eql([{
        publicId: 'test-3',
        date: '2020-10-01',
        value: 100
      }]);
    });
  });

  describe('#updateRaygRowForSingleMeasureWithNoFilter', () => {
    const entities = [{ id: 1, value: 'hello again', parentStatementPublicId: 'state-1'  }];
    const measuresEntities = [{ metricID: 'metric1', date: '05/10/2020', value: 2 }];
    const raygEntities = [{ value: 1, publicId: 'pub-1', parentStatementPublicId: 'state-1' }];
    const uniqMetricIds = ['metric1'];

    it('should return an array when measure is the only item in the group and that has not filter values set', async () => {
      const formData = { day: 6, month: 10, year: 2020 };
      const response = await page.updateRaygRowForSingleMeasureWithNoFilter(entities, formData, measuresEntities, raygEntities, uniqMetricIds);
      expect(response).to.eql([entities[0], { publicId: 'pub-1', parentStatementPublicId: 'state-1', value: "hello again", date: "2020-10-06" }]);
    });

    it('should return input date when date is older than latest measure date', async () => {
      const formData = { day: 5, month: 10, year: 2020 };
      const response = await page.updateRaygRowForSingleMeasureWithNoFilter(entities, formData, measuresEntities, raygEntities, uniqMetricIds);
      expect(response).to.eql(entities);
    });
  });

  describe('#generateInputValues', () => {
    const selecteDate = '15/10/2020';

    it('should return value for inputs when label and label2 are set' , async () => {
      const measureEntities = [{ id: '123', value: 'value 1', label: 'test', label2: 'test2' }, { id: '456', value: 'value 2', label: 'test2', }];
      const uiInputs = [{ id: '456',  label: 'test', label2: 'test2' }]
      const response =  page.generateInputValues(uiInputs, measureEntities, selecteDate)

      expect(response).to.eql({
        entities: { 456: 'value 1' },
        date: ["15", "10", "2020"]
      });
    });

    it('should return value for inputs when label is set and label2 is not' , async () => {
      const measureEntities = [{ id: '123', value: 'value 1', label: 'test', label2: 'test2' }, { id: '456', value: 'value 2', label: 'test' }];
      const uiInputs = [{ id: '678', label: 'test' }]
      const response =  page.generateInputValues(uiInputs, measureEntities, selecteDate)

      expect(response).to.eql({
        entities: { 678: 'value 2' },
        date: ["15", "10", "2020"]
      });
    });

    it('should return value for inputs when label is set and label2 is not' , async () => {
      const measureEntities = [{ id: '123', value: 'value 1', label: 'test', label2: 'test2' }, { id: '456', value: 'value 3', }];
      const uiInputs = [{ id: '890' }]
      const response =  page.generateInputValues(uiInputs, measureEntities, selecteDate)

      expect(response).to.eql({
        entities: { 890: 'value 3' },
        date: ["15", "10", "2020"]
      });
    });
  });

  describe('#getMeasureData', () => {
    const measureEntities = {
      measureEntities: [{ metricID: 'metric1', date: '05/10/2020', value: 2, filter: 'test' }, { metricID: 'metric1', date: '04/10/2020', value: 1, filter: 'test'  }],
      raygEntities: [{ value: 1 }],
      uniqMetricIds: ['metric1']
    };

    beforeEach(() => {
      sinon.stub(page, 'getMeasure').returns(measureEntities);
    });

    afterEach(() => {
      page.getMeasure.restore();
    });

    it('getMeasureData should call getMeasure', async () => {
      await page.getMeasureData();
      sinon.assert.calledOnce(page.getMeasure);
    });
  });

  describe('#addMeasureEntityData', () => {
    const errors = [{ error: 'error' }]
    const parsedEntities = [{ id: 1, value: 'parsed again' }];

    const getMeasureData = {
      measureEntities: [{ metricID: 'metric1', date: '05/10/2020', value: 2 }, { metricID: 'metric1', date: '10/10/2020', value: 3 }],
      raygEntities: [{ value: 1, publicId: 'pub-1', parentPublicId: 'state-1' }],
      uniqMetricIds: ['metric1']
    };

    beforeEach(() => {
      sinon.stub(page, 'saveMeasureData').returns({})
      sinon.stub(page, 'updateRaygRowForSingleMeasureWithNoFilter').returns()
      sinon.stub(measures, 'validateEntities').returns([]);
      sinon.stub(page, 'getMeasure').returns(getMeasureData);
      sinon.stub(page, 'renderRequest').returns();
    });

    afterEach(() => {
      measures.validateFormData.restore();
      measures.validateEntities.restore();
      page.saveMeasureData.restore();
      page.updateRaygRowForSingleMeasureWithNoFilter.restore();
      page.getMeasure.restore();
      page.renderRequest.restore();
    });

    it('should return errors when validateFormData return errors', async () => {
      page.req.params.date = '10/10/2020'
      const formData = { day: 1, month: '', year: 2020, type: 'entries', entities: { 123: 100 } };
      sinon.stub(measures, 'validateFormData').returns(["error"])

      await page.updateMeasureValues(formData);

      sinon.assert.calledWith(measures.validateFormData, formData);
      sinon.assert.calledWith(page.renderRequest, res, { errors: ["error"] })
    });

    it('should return errors when validateEntities returns errors', async () => {
      sinon.stub(measures, 'validateFormData').returns([])
      measures.validateEntities.returns({ errors, parsedEntities })
      const formData = { day: 1, month: 2, year: 2020, type: 'entries', entities: { 123: 100 } };

      await page.updateMeasureValues(formData);

      sinon.assert.calledWith(page.renderRequest, res, { errors: ["Error in entity data"] })
    });

    it('should call saveMeasureData with parsedEntities data', async () => {
      sinon.stub(measures, 'validateFormData').returns([])
      measures.validateEntities.returns({ errors: [], parsedEntities })
      page.updateRaygRowForSingleMeasureWithNoFilter.returns(parsedEntities);
      const formData = { day: 1, month: 2, year: 2020, type: 'entries', entities: { 123: 100 } };

      await page.updateMeasureValues(formData);

      sinon.assert.calledWith(page.saveMeasureData, parsedEntities);
    });
  });

  describe('#saveMeasureData', () => {
    const categoryFields = [{ id: 1 }];
    const category = { name: 'Measure' };
    const entities  = [{ id: 1, value: 'some-value' }];

    beforeEach(() => {
      sinon.stub(Category, 'fieldDefinitions').returns(categoryFields);
      Category.findOne.resolves(category);
      sinon.stub(Entity, 'import');

    });

    afterEach(() => {
      Entity.import.restore();
      Category.fieldDefinitions.restore();
    });

    it('save entities to the database', async () => {
      const transaction = sequelize.transaction();
      transaction.commit.reset();
      transaction.rollback.reset();

      await page.saveMeasureData(entities);

      sinon.assert.calledWith(Entity.import, entities[0], category, categoryFields, { transaction });
      sinon.assert.calledOnce(transaction.commit);
      const { metricId, groupId, date } = req.params;
      sinon.assert.calledWith(page.res.redirect, `${page.url}/${metricId}/${groupId}/${encodeURIComponent(date)}/successful`);
    });

    it('rollback transaction on error', async () => {
      const transaction = sequelize.transaction();
      transaction.commit.reset();
      transaction.rollback.reset();

      Entity.import.throws(new Error('error'));

      await page.saveMeasureData(entities);

      const { metricId, groupId, date } = req.params

      sinon.assert.calledWith(page.res.redirect, `${page.url}/${metricId}/${groupId}/${encodeURIComponent(date)}`);
      sinon.assert.calledOnce(transaction.rollback);
    });
  });
});