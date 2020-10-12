const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const CategoryField = require('models/categoryField');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-group/MeasureGroup', () => {
  beforeEach(() => {
    const MeasureGroup = require('pages/data-entry-entity/measure-group/MeasureGroup');

    res = { cookies: sinon.stub(), sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {}, render: sinon.stub(), redirect: sinon.stub() };
    req = { cookies: [], query: { category: 'category' }, user: { roles: [] }, params: {}, flash: sinon.stub() };
    res.status.returns(res);

    page = new MeasureGroup('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(entityUserPermissions, 'assignEntityIdsUserCanAccessToLocals');
  });

  afterEach(() => {
    authentication.protect.restore();
    entityUserPermissions.assignEntityIdsUserCanAccessToLocals.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureGroup);
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader']),
        entityUserPermissions.assignEntityIdsUserCanAccessToLocals,
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader']);
    });
  });

  describe('#successfulMode', () => {
    it('returns true if in successfulMode', () => {
      page.req.params.successful = 'successful';
      expect(page.successfulMode).to.be.ok;
    });
  });

  describe('#editUrl', () => {
    it('get edit url', () => {
      page.req.params.entityPublicId = 'some-id';
      expect(page.editUrl).to.eql(`${paths.dataEntryEntity.measureGroup}/${page.req.params.entityPublicId}`);
    });
  });

  describe('#getSuccessUrl', () => {
    it('get gsuccess url', () => {
      page.req.params.entityPublicId = 'some-id';
      expect(page.getSuccessUrl).to.eql(`${paths.dataEntryEntity.measureGroup}/${page.req.params.entityPublicId}/successful`);
    });
  });

  describe('#handler', () => {
    it('responeds with method not allowed if not admin and no entitiesUserCanAccess', async () => {
      page.res.locals.entitiesUserCanAccess = [];

      await page.handler(req, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });

    it('responeds with method not allowed if not admin and no access to this entity public id', async () => {
      req.params.entityPublicId = 'some-id';
      page.res.locals.entitiesUserCanAccess = [{ publicId: 'some-other-id' }];

      await page.handler(req, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });

    it('allows user access', async () => {
      req.params.entityPublicId = 'some-id';
      page.res.locals.entitiesUserCanAccess = [{ publicId: 'some-id' }];

      await page.handler(req, res);

      sinon.assert.neverCalledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.neverCalledWith(res.send, 'You do not have permisson to access this resource.');
    });
  });

  describe('#getRequest', () => {
    it('clears data if in successfulMode', async () => {
      page.res.locals.entitiesUserCanAccess = [1,2,3];
      page.req.params.successful = 'successful';

      sinon.stub(page, 'clearData');

      await page.getRequest(req, res);

      sinon.assert.called(page.clearData);
    });
  });

  describe('#validateGroup', () => {
    let group = {};
    beforeEach(() => {
      group = {
        groupDescription: 'some group description',
        redThreshold: 1,
        aYThreshold: 2,
        greenThreshold: 3,
        value: 3,
        commentsOnly: 'Yes'
      }
    });

    it('returns error if no group description', () => {
      delete group.groupDescription;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["You must enter a group description"]);
    });

    it('returns error if no redThreshold', () => {
      delete group.redThreshold;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Red threshold must be a number"]);
    });

    it('returns error if no aYThreshold', () => {
      delete group.aYThreshold;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Amber/Yellow threshold must be a number"]);
    });

    it('returns error if no greenThreshold', () => {
      delete group.greenThreshold;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Green threshold must be a number"]);
    });

    it('returns error if no value', () => {
      delete group.value;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Group total value must be a number"]);
    });

    it('returns error if redThreshold is not a number', () => {
      group.redThreshold = 's';

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Red threshold must be a number"]);
    });

    it('returns error if aYThreshold is not a number', () => {
      group.aYThreshold = 's';

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Amber/Yellow threshold must be a number"]);
    });

    it('returns error if greenThreshold is not a number', () => {
      group.greenThreshold = 's';

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Green threshold must be a number"]);
    });

    it('returns error if value is not a number', () => {
      group.value = 's';

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Group total value must be a number"]);
    });

    it('returns error if redThreshold is more than aYThreshold', () => {
      group.redThreshold = 3;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["The red threshold must be lower than the amber/yellow threshold"]);
    });

    it('returns error if aYThreshold is more than greenThreshold', () => {
      group.aYThreshold = 4;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["The Amber/Yellow threshold must be lower than the green threshold"]);
    });

    it('returns error if commentsOnly is set and is not equal to Yes', () => {
      group.commentsOnly = "Something";

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Comments Only can only equal Yes"]);
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

  describe('#updateGroup', () => {
    const data = {
      redThreshold: 1,
      aYThreshold: 1,
      greenThreshold: 1,
      groupDescription: 'some desc',
      value: 1,
      commentsOnly: true
    };
    const entity = { id: 1 };

    const category = { id: 1 };
    const categoryFields = [{ id: 1 }];
    const measureEntity = {};

    const transaction = sequelize.transaction();

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(category);
      sinon.stub(page, 'getMeasure').returns(measureEntity);
      sinon.stub(Entity, 'import').returns(entity);
      sinon.stub(Category, 'fieldDefinitions').returns(categoryFields);

      transaction.commit.reset();
      transaction.rollback.reset();
    });

    afterEach(() => {
      Entity.import.restore();
      Category.fieldDefinitions.restore();
    });

    it('imports group data if no errors', async () => {
      console.log('here 1');
      await page.updateGroup(data);

      sinon.assert.called(transaction.commit);
      sinon.assert.calledWith(Entity.import, data, category, categoryFields, { transaction, ignoreParents: true });
    });

    it('rolls back if errors', async () => {
      Entity.import.throws(new Error('some error'));

      let message = '';
      try{
        await page.updateGroup(data);
      } catch (error) {
        message = error.message;
      }

      expect(message).to.eql('some error');

      sinon.assert.notCalled(transaction.commit);
      sinon.assert.called(transaction.rollback);
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      sinon.stub(page, 'saveData');
      sinon.stub(page, 'validateGroup');
      sinon.stub(page, 'updateGroup');
      page.req.originalUrl = 'some-url';
    });

    it('redirects to original url with errors', async () => {
      page.req.params = { uid: 'someid' };
      page.validateGroup.returns(['some error']);

      await page.postRequest(req, res);

      sinon.assert.calledOnce(page.saveData);
      sinon.assert.calledWith(page.req.flash, 'some error');
      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
    });

    it('redirects if save works', async () => {
      page.req.params = { uid: 'someid' };
      page.req.params.entityPublicId = 'some-id';

      await page.postRequest(req, res);

      sinon.assert.calledOnce(page.saveData);
      sinon.assert.notCalled(page.req.flash);
      sinon.assert.calledOnce(page.updateGroup);
      sinon.assert.calledWith(page.res.redirect, `${paths.dataEntryEntity.measureGroup}/${page.req.params.entityPublicId}/successful`);
    });
  });

  describe('#getMeasure', () => {
    const entity = {
      id: 'some-id',
      publicId: 'some-public-id-2',
      entityFieldEntries: [{
        categoryField: { name: 'name' },
        value: 'some name'
      },{
        categoryField: { name: 'filter' },
        value: 'RAYG'
      }]
    };

    beforeEach(() => {
      Entity.findOne.returns(entity);
      req.params.entityPublicId = 'some-id';
    });

    it('gets the measure entity and maps the field entries', async () => {
      const response = await page.getMeasure();
      expect(response).to.eql({
        filter: "RAYG",
        id: "some-id",
        name: "some name",
        publicId: "some-public-id-2"
      });

      sinon.assert.calledWith(Entity.findOne, {
        where: {
          publicId: req.params.entityPublicId
        },
        include: [{
          separate: true,
          model: EntityFieldEntry,
          include: CategoryField
        }]
      });
    });

    it('returns error not a RAYG row', async () => {
      entity.entityFieldEntries[1].value = '';

      const response = await page.getMeasure();
      expect(response).to.eql({
        error: 'This is not a group'
      });
    });
  });
});
