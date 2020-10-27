const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const CategoryField = require('models/categoryField');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');
const filterMetricsHelper = require('helpers/filterMetrics');

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
    sinon.stub(filterMetricsHelper,'filterMetrics').returnsArg(1);
  });

  afterEach(() => {
    authentication.protect.restore();
    filterMetricsHelper.filterMetrics.restore();
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
      page.req.params.groupId = 'some-id';
      expect(page.editUrl).to.eql(`${paths.dataEntryEntity.measureGroup}/${page.req.params.groupId}`);
    });
  });

  describe('#getSuccessUrl', () => {
    it('get gsuccess url', () => {
      page.req.params.groupId = 'some-id';
      expect(page.getSuccessUrl).to.eql(`${paths.dataEntryEntity.measureGroup}/${page.req.params.groupId}/successful`);
    });
  });

  describe('#getRequest', () => {
    it('clears data if in successfulMode', async () => {
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
        value: 3
      }
    });

    it('returns error if no group description', () => {
      delete group.groupDescription;

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["You must enter a group description"]);
    });

    it('returns error if value is not a number', () => {
      group.value = 's';

      const errors = page.validateGroup(group);

      expect(errors).to.eql(["Group total value must be a number"]);
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
      groupDescription: 'some desc',
      value: 1
    };
    const entity = { id: 1 };

    const category = { id: 1 };
    const categoryFields = [{ id: 1 }];
    const groupEntities = [{}];

    const transaction = sequelize.transaction();

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(category);
      sinon.stub(page, 'getGroupEntities').returns(groupEntities);
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
      page.req.params.groupId = 'some-id';

      await page.postRequest(req, res);

      sinon.assert.calledOnce(page.saveData);
      sinon.assert.notCalled(page.req.flash);
      sinon.assert.calledOnce(page.updateGroup);
      sinon.assert.calledWith(page.res.redirect, `${paths.dataEntryEntity.measureGroup}/${page.req.params.groupId}/successful`);
    });
  });

  describe('#getGroupEntities', () => {
    const entites = [{
      id: 'some-id',
      publicId: 'some-public-id-2',
      entityFieldEntries: [{
        categoryField: { name: 'groupId' },
        value: 'some name'
      },{
        categoryField: { name: 'filter' },
        value: 'RAYG'
      }]
    }];

    beforeEach(() => {
      Entity.findAll.returns(entites);
      EntityFieldEntry.findAll.returns(entites[0].entityFieldEntries);
      page.req.params.groupId = 'some-id';
    });

    it('gets the measure entity and maps the field entries', async () => {
      const response = await page.getGroupEntities();
      expect(response).to.eql([{
        filter: "RAYG",
        id: "some-id",
        groupId: "some name",
        publicId: "some-public-id-2"
      }]);

      sinon.assert.calledWith(Entity.findAll, {
        include: [{
          model: EntityFieldEntry,
          where: { value: page.req.params.groupId },
          include: {
            model: CategoryField,
            where: { name: 'groupId' },
          }
        }]
      });
    });
  });
});
