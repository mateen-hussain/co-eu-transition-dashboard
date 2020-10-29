const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const config = require('config');
const MeasureEdit = require('pages/data-entry-entity/measure-edit/MeasureEdit');
const authentication = require('services/authentication');
const rayg = require('helpers/rayg');
const filterMetricsHelper = require('helpers/filterMetrics');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');
const measures = require('helpers/measures')

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-edit/MeasureEdit', () => {
  beforeEach(() => {

    res = { cookies: sinon.stub(), redirect: sinon.stub(), render: sinon.stub(),   sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { body: {}, cookies: [], params: { groupId: 'group-1', metricId: 'measure-1', type: 'add' }, user: { roles: [], getPermittedMetricMap: sinon.stub().returns({}) }, flash: sinon.stub() };
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

  describe('#addUrl', () => {
    it('returns url for add measure', () => {
      expect(page.addUrl).to.eql(`${page.url}/${req.params.metricId}/${req.params.groupId}/add`);
    });
  });

  describe('#editUrl', () => {
    it('returns url for edit measure', () => {
      expect(page.editUrl).to.eql(`${page.url}/${req.params.metricId}/${req.params.groupId}/edit`);
    });
  });

  describe('#addMeasure', () => {
    it('returns true when type equals add', () => {
      page.req.params = { metricId: '123', successful: 'successful', type: "add" };
      expect(page.addMeasure).to.be.ok;
    });

    it('returns false when type does not equal add', () => {
      page.req.params = { metricId: '123', successful: 'successful', type: "other" };
      expect(page.addMeasure).to.be.not.ok;
    });
  });

  describe('#editMeasure', () => {
    it('returns true when type equals edit', () => {
      page.req.params = { metricId: '123', successful: 'successful', type: "edit" };
      expect(page.editMeasure).to.be.ok;
    });

    it('returns false when type does not equal edit', () => {
      expect(page.editMeasure).to.be.not.ok;
    });
  });

  describe('#successfulMode', () => {
    it('returns true when in successful mode', () => {
      page.req.params = { metricId: '123', type: "successful" };
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
        flash
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


  describe('#getMeasureEntitiesFromGroup', () => {

    it('should return filter data which only contains the same metric, sorted by date', async () => {
      const measure1 = { name: 'test1', metricID: 'measure-1', date: '05/10/2020' }
      const measure2 = { name: 'test2', metricID: 'measure-2', date: '05/10/2020' }
      const measure3 = { name: 'test3', metricID: 'measure-1', date: '04/10/2020' }
      const groupEntities = [measure1, measure2, measure3];
      const response = await page.getMeasureEntitiesFromGroup(groupEntities);

      expect(response).to.eql([ measure3, measure1 ]);
    });
  });

  describe('#getGroupEntities', () => {
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
    const theme = { id: 1 };
    const entityFieldEntries = [{ value: 'new value', categoryField: { name: 'test' } }];

    beforeEach(() => {
      sinon.stub(measures, 'getEntityFields').returns(entityFieldEntries)
      Entity.findAll.returns([entities]);
      sinon.stub(rayg, 'getRaygColour').returns('green');
      sinon.stub(filterMetricsHelper,'filterMetrics').returnsArg(1);
    });

    afterEach(() => {
      measures.getEntityFields.restore();
      rayg.getRaygColour.restore();
      filterMetricsHelper.filterMetrics.restore();
    });

    it('gets entities for a given category if admin', async () => {
      page.req.user = {
        isAdmin: true,
        getPermittedMetricMap: sinon.stub().returns({})
      };

      const response = await page.getGroupEntities(category, theme);

      expect(response).to.eql({ 
        groupEntities: [{
          id: 'some-id',
          parentPublicId: 'parent-1',
          publicId: 'some-public-id-1',
          colour: 'green',
          theme: 'borders',
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
    const measureEntities = {
      groupEntities : [{ metricID: 'measure-1', id: 'new-id', publicId: 'pubId', parents: [], entityFieldEntries: [{ categoryField: { name: 'test' }, value: 'new value' }] }],
      raygEntities: [{ publicId: 'rayg1', filter: 'RAYG' }]
    };

    beforeEach(() => {
      sinon.stub(measures, 'getCategory').returns(measureCategory);
      sinon.stub(page, 'getMeasureEntitiesFromGroup');
      sinon.stub(page, 'getGroupEntities').returns(measureEntities);
    });

    afterEach(() => {
      measures.getCategory.restore();
      page.getMeasureEntitiesFromGroup.restore();
      page.getGroupEntities.restore();
    });

    it('Get measures data', async () => {
      page.getMeasureEntitiesFromGroup.returns(measureEntities.groupEntities);

      const response = await page.getMeasure();

      sinon.assert.calledTwice(measures.getCategory);
      sinon.assert.calledOnce(page.getGroupEntities);
      sinon.assert.calledOnce(page.getMeasureEntitiesFromGroup);

      expect(response).to.eql({
        measuresEntities: measureEntities.groupEntities,
        raygEntities: measureEntities.raygEntities,
        uniqMetricIds: ['measure-1']
      });
    });

    it('redirects to list if no entity data', async () => {
      page.getMeasureEntitiesFromGroup.returns([]);
      await page.getMeasure();

      sinon.assert.calledTwice(measures.getCategory);
      sinon.assert.calledOnce(page.getGroupEntities);
      sinon.assert.calledOnce(page.getMeasureEntitiesFromGroup);
      sinon.assert.calledWith(res.redirect, paths.dataEntryEntity.measureList);
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

    it('displayOverallRaygDropdown should be true when only item in a group and filter is set', async () => {
      await page.getMeasureData();
      sinon.assert.calledOnce(page.getMeasure);
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
      sinon.stub(measures, 'getCategory').returns(statementCategory)
      Entity.findAll.returns([entities]);
    });

    afterEach(() => {
      measures.getCategory.restore();
    });

    it('gets entities to be cloned if admin', async () => {
      req.user = { isAdmin: true }
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
  });

  describe('#createEntitiesFromClonedData', () => {
    const entities = [{
      id: 123,
      publicId: 'some-public-id-1',
      value: 10
    }];
    const formData = { day: 1, month: 10, year: 2020, type: 'entries', entities: { 123: 100 } };

    it('should return the correct data structure', async () => {
      const response = await page.createEntitiesFromClonedData(entities, formData);

      expect(response).to.eql([{
        publicId: 'some-public-id-1',
        date: '2020-10-01',
        value: 100
      }]);
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      sinon.stub(page, 'addMeasureEntityData').returns([])
      sinon.stub(page, 'updateMeasureInformation').returns([])
    });

    afterEach(() => {
      page.addMeasureEntityData.restore();
      page.updateMeasureInformation.restore();
    });

    it('should return method not allowed when no admin and entitiesUserCanAccess is empty', async () => {
      res.locals = {
        entitiesUserCanAccess: []
      }
      await page.postRequest({}, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });

    it('should call addMeasureEntityData when type is add', async () => {
      page.req.params = { metricId: '123', successful: 'successful', type: "add" };
      req.user = { isAdmin: true, getPermittedMetricMap: sinon.stub().returns({}) }

      await page.postRequest(req, res);

      sinon.assert.calledWith(page.addMeasureEntityData, req.body);
    });

    it('should call addMeasureEntityData when type is edit', async () => {
      page.req.params = { metricId: '123', successful: 'successful', type: "edit" };
      req.user = { isAdmin: true, getPermittedMetricMap: sinon.stub().returns({}) }

      await page.postRequest(req, res);

      sinon.assert.calledWith(page.updateMeasureInformation, req.body);
    });

    it('should call redirect if no error and not add or Edit Measure', async () => {
      req.user = { isAdmin: true, getPermittedMetricMap: sinon.stub().returns({}) }
      page.req.params = { metricId: '123', type: "other" };

      await page.postRequest(req, res);

      sinon.assert.calledOnce(res.redirect);
    });
  });

  describe('#updateMeasureInformation', () => {
    const UpdatedEntities = [{ id: 1, value: 'hello again' }];

    beforeEach(() => {
      sinon.stub(page, 'saveMeasureData').returns({})
      sinon.stub(page, 'updateMeasureEntities').returns(UpdatedEntities)
      sinon.stub(page, 'renderRequest').returns({})
    });

    afterEach(() => {
      page.saveMeasureData.restore();
      page.updateMeasureEntities.restore();
      page.renderRequest.restore();
    });

    it('should return an error when validateMeasureInformation an error', async () => {
      const formData = { name: 'test' };
      sinon.stub(page, 'validateMeasureInformation').returns(["error"])

      await page.updateMeasureInformation(formData);

      sinon.assert.calledWith(page.validateMeasureInformation, formData);
      sinon.assert.calledWith(page.renderRequest, res, { errors: ["error"] })
    });

    it('should call saveMeasureData with updatedEntites data', async () => {
      const formData = { name: 'test' };
      sinon.stub(page, 'validateMeasureInformation').returns([])

      await page.updateMeasureInformation(formData);

      sinon.assert.calledWith(page.saveMeasureData, UpdatedEntities, '#measure-information', { ignoreParents: true });
    });
  });

  describe('#updateRaygRowForSingleMeasureWithNoFilter', () => {
    const entities = [{ id: 1, value: 'hello again', parentStatementPublicId: 'state-1'  }];
    const measuresEntities = [{ metricID: 'metric1', date: '05/10/2020', value: 2 }];
    const raygEntities = [{ value: 1, publicId: 'pub-1', parentPublicId: 'state-1' }];
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

  describe('#updateMeasureEntities', () => {
    const entities = {
      measuresEntities: [{ publicId: 'id-test', metricId: 'met1', filter: 'test' }],
      raygEntities: [{ publicId: 'id-number-2' }],
      uniqMetricIds: ['met1']
    }

    beforeEach(() => {
      sinon.stub(page, 'getMeasure').returns(entities)
    });

    afterEach(() => {
      page.getMeasure.restore();
    });

    it('should return a new object combined with form data', async () => {
      const formData = { name: 'test', additionalComment: 'comment', redThreshold: 1, aYThreshold:2, greenThreshold: 3  };
      const response = await page.updateMeasureEntities(formData);
      expect(response).to.eql([{ publicId: 'id-test', ...formData }]);
    });

    it('should add RAGY to data when measure is comments only', async () => {
      const formData = { name: 'test', additionalComment: 'comment', groupValue: 2, commentsOnly: "Yes"  };
      const response = await page.updateMeasureEntities(formData);
      const { groupValue, additionalComment, name } = formData;
      expect(response).to.eql([{ publicId: 'id-test', value: groupValue, additionalComment, name }, { publicId: 'id-number-2', value: groupValue, additionalComment, name, groupDescription: name  }]);
    });

    it('should add RAGY to data when isOnlyMeasureInGroup and groupValue is in data', async () => {
      const formData = { name: 'test', additionalComment: 'comment', redThreshold: 1, aYThreshold:2, greenThreshold: 3, groupValue: 2  };
      const response = await page.updateMeasureEntities(formData);
      const { groupValue, ...formNoGroupData } = formData;
      expect(response).to.eql([{ publicId: 'id-test', ...formNoGroupData }, { publicId: 'id-number-2', value: groupValue, name: 'test', groupDescription: 'test', additionalComment: 'comment' }]);
    });

    it('should add RAGY to data when isOnlyMeasureInGroup && doesNotHaveFilter', async () => {
      const entities = {
        measuresEntities: [{ publicId: 'id-test', metricId: 'met1' }],
        raygEntities: [{ publicId: 'id-number-2' }],
        uniqMetricIds: ['met1']
      }
      page.getMeasure.returns(entities)
      const formDataNoGroup = { name: 'test', additionalComment: 'comment', redThreshold: 1, aYThreshold:2, greenThreshold: 3,  };
      const formData = { ...formDataNoGroup, groupValue: 2  };
      const response = await page.updateMeasureEntities(formData);
      expect(response).to.eql([{ publicId: 'id-test', ...formDataNoGroup }, { publicId: 'id-number-2', redThreshold: 1, aYThreshold:2, greenThreshold: 3, name: 'test', groupDescription: 'test', additionalComment: 'comment',   }]);
    });
  });

  describe('#validateMeasureInformation', () => {
    let fields = {};
    beforeEach(() => {
      fields = {
        name: 'some description',
        redThreshold: 1,
        aYThreshold: 2,
        greenThreshold: 3,
      }
    });

    it('returns error if no group name', () => {
      delete fields.name;
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["You must enter a name"]);
    });

    it('returns error if no redThreshold', () => {
      delete fields.redThreshold;
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Red threshold must be a number"]);
    });

    it('returns error if no aYThreshold', () => {
      delete fields.aYThreshold;
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Amber/Yellow threshold must be a number"]);
    });

    it('returns error if no greenThreshold', () => {
      delete fields.greenThreshold;
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Green threshold must be a number"]);
    });

    it('returns error if redThreshold is not a number', () => {
      fields.redThreshold = 's';
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Red threshold must be a number"]);
    });

    it('returns error if aYThreshold is not a number', () => {
      fields.aYThreshold = 's';
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Amber/Yellow threshold must be a number"]);
    });

    it('returns error if greenThreshold is not a number', () => {
      fields.greenThreshold = 's';
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Green threshold must be a number"]);
    });

    it('returns error if redThreshold is more than aYThreshold', () => {
      fields.redThreshold = 3;
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["The red threshold must be lower than the amber/yellow threshold"]);
    });

    it('returns error if aYThreshold is more than greenThreshold', () => {
      fields.aYThreshold = 4;
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["The Amber/Yellow threshold must be lower than the green threshold"]);
    });

    it('returns error if groupValue is set but not a number', () => {
      fields.groupValue = 'test';
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql(["Overall RAYG value must be a number"]);
    });

    it('dont validate thresholds if comment only measure', () => {
      fields.greenThreshold = 's';
      fields.redThreshold = 's';
      fields.aYThreshold = 's';
      fields.commentsOnly = "Yes";
      const errors = page.validateMeasureInformation(fields);
      expect(errors).to.eql([]);
    });
  });


  describe('#addMeasureEntityData', () => {
    const clonedEntities = [{ id: 1, value: 'hello' }];
    const newEntities = [{ id: 1, value: 'hello again' }];
    const errors = [{ error: 'error' }]
    const parsedEntities = [{ id: 1, value: 'parsed again' }];

    const getMeasureData = {
      measuresEntities: [{ metricID: 'metric1', date: '05/10/2020', value: 2 }],
      raygEntities: [{ value: 1, publicId: 'pub-1', parentPublicId: 'state-1' }],
      uniqMetricIds: ['metric1']
    };

    beforeEach(() => {
      sinon.stub(page, 'getEntitiesToBeCloned').returns(clonedEntities)
      sinon.stub(page, 'createEntitiesFromClonedData').returns(newEntities)
      sinon.stub(page, 'saveMeasureData').returns({})
      sinon.stub(page, 'renderRequest').returns()
      sinon.stub(page, 'updateRaygRowForSingleMeasureWithNoFilter').returns()
      sinon.stub(page, 'getMeasure').returns(getMeasureData);
      sinon.stub(measures, 'validateEntities').returns([]);
    });

    afterEach(() => {
      measures.validateFormData.restore();
      measures.validateEntities.restore();
      page.getEntitiesToBeCloned.restore();
      page.createEntitiesFromClonedData.restore();
      page.saveMeasureData.restore();
      page.renderRequest.restore();
      page.updateRaygRowForSingleMeasureWithNoFilter.restore();
      page.getMeasure.restore();
    });

    it('should return errors when validateFormData return errors', async () => {
      const formData = { day: 1,  year: 2020, type: 'entries', entities: { 123: 100 } };
      sinon.stub(measures, 'validateFormData').returns(["error"])

      await page.addMeasureEntityData(formData);

      sinon.assert.calledWith(measures.validateFormData, formData);
      sinon.assert.calledWith(page.renderRequest, res, { errors: ["error"] })
    });

    it('should return errors when validateEntities returns errors', async () => {
      sinon.stub(measures, 'validateFormData').returns([])
      measures.validateEntities.returns({ errors, parsedEntities })
      const formData = { day: 1, month: 2, year: 2020, type: 'entries', entities: { 123: 100 } };

      await page.addMeasureEntityData(formData);

      sinon.assert.calledWith(page.renderRequest, res, { errors: ["Error in entity data"] })
    });

    it('should call saveMeasureData with parsedEntities data', async () => {
      sinon.stub(measures, 'validateFormData').returns([])
      measures.validateEntities.returns({ errors: [], parsedEntities })
      page.updateRaygRowForSingleMeasureWithNoFilter.returns(parsedEntities);
      const formData = { day: 1, month: 2, year: 2020, type: 'entries', entities: { 123: 100 } };

      await page.addMeasureEntityData(formData);

      sinon.assert.calledWith(page.getEntitiesToBeCloned, ["123"]);
      sinon.assert.calledWith(page.createEntitiesFromClonedData, clonedEntities, formData);
      sinon.assert.calledWith(measures.validateEntities, newEntities);
      sinon.assert.calledWith(page.saveMeasureData, parsedEntities);
    });
  });

  describe('#saveMeasureData', () => {
    const categoryFields = [{ id: 1 }];
    const category = { name: 'Measure' };
    const entities  = [{ id: 1, value: 'some-value' }];
    const URLHash = '#hash'

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

      await page.saveMeasureData(entities, URLHash);

      sinon.assert.calledWith(Entity.import, entities[0], category, categoryFields, { transaction });
      sinon.assert.calledOnce(transaction.commit);
      sinon.assert.calledWith(page.res.redirect, `${page.url}/${req.params.metricId}/${req.params.groupId}/successful${URLHash}`);
    });

    it('rollback transaction on error', async () => {
      const transaction = sequelize.transaction();
      transaction.commit.reset();
      transaction.rollback.reset();

      Entity.import.throws(new Error('error'));

      await page.saveMeasureData(entities, URLHash);

      sinon.assert.calledWith(page.res.redirect, `${page.url}/${req.params.metricId}/${req.params.groupId}${URLHash}`);
      sinon.assert.calledOnce(transaction.rollback);
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

      expect(MeasureEdit.isEnabled).to.be.ok;
    });

    it('should be enabled if measureUpload feature is not active', () => {
      sandbox.stub(config, 'features').value({
        measureUpload: false
      });

      expect(MeasureEdit.isEnabled).to.not.be.ok;
    })
  })
});
