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

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-value/MeasureValue', () => {
  beforeEach(() => {

    res = { cookies: sinon.stub(), redirect: sinon.stub(), render: sinon.stub(),   sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { body: {}, cookies: [], params: { metricId: 'measure-1', data: '12/10/2020' }, user: { roles: [], getPermittedMetricMap: sinon.stub().returns({}) }, flash: sinon.stub() };
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
      expect(page.pathToBind).to.eql(`${paths.dataEntryEntity.measureValue}/:metricId/:date`);
    });
  });

  describe('#editUrl', () => {
    it('returns url for edit measure value', () => {
      expect(page.editUrl).to.eql(`${page.url}/${req.params.measureId}`);
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

  describe('#getMeasureEntities', () => {
    const entities = {
      id: 'some-id',
      publicId: 'some-public-id-1',
      parents: [
        {
          publicId: 'parent-1',
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
    const entityFieldEntries = [{ value: 'new value', categoryField: { name: 'test' } }];

    beforeEach(() => {
      sinon.stub(measures, 'getEntityFields').returns(entityFieldEntries)
      Entity.findAll.returns([entities]);
    });

    afterEach(() => {
      measures.getEntityFields.restore();
    });

    it('gets entities for a given category if admin', async () => {
      page.req.user = {
        isAdmin: true,
        getPermittedMetricMap: sinon.stub().returns({})
      };

      const response = await page.getMeasureEntities(category);

      expect(response).to.eql({ 
        measuresEntities: [{
          id: 'some-id',
          parentPublicId: 'parent-1',
          publicId: 'some-public-id-1',
          test: 'new value',
        }],
        raygEntities: []
      });

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
          }]
        }]
      });
    });
  });

  describe('#getMeasure', () => {
    const measureCategory = { id: 'some-category' };
    const measureEntities = {
      measuresEntities : [{ metricID: 'measure-1', id: 'new-id', publicId: 'pubId', parents: [], entityFieldEntries: [{ categoryField: { name: 'test' }, value: 'new value' }] }],
      raygEntities: [{ publicId: 'rayg1', filter: 'RAYG' }]
    };

    beforeEach(() => {
      sinon.stub(measures, 'getCategory').returns(measureCategory);
      sinon.stub(page, 'getMeasureEntities').returns({ measuresEntities: [], raygEntities: [] });
    });

    afterEach(() => {
      measures.getCategory.restore();
      page.getMeasureEntities.restore();
    });

    it('Get measures data', async () => {
      page.getMeasureEntities.returns(measureEntities);

      const response = await page.getMeasure();

      sinon.assert.calledOnce(measures.getCategory);
      sinon.assert.calledOnce(page.getMeasureEntities);

      expect(response).to.eql({
        measuresEntities: measureEntities.measuresEntities,
        raygEntities: measureEntities.raygEntities
      });
    });

    it('redirects to list if no entity data', async () => {
      await page.getMeasure();

      sinon.assert.calledOnce(measures.getCategory);
      sinon.assert.calledOnce(page.getMeasureEntities);
      sinon.assert.calledWith(res.redirect, paths.dataEntryEntity.measureList);
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
      measuresEntities: [{ metricID: 'metric1', date: '05/10/2020', value: 2, filter: 'test' }, { metricID: 'metric1', date: '04/10/2020', value: 1, filter: 'test'  }],
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

});