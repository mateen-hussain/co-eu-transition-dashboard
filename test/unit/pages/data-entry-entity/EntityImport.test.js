const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const authentication = require('services/authentication');
const proxyquire = require('proxyquire');
const flash = require('middleware/flash');
const Entity = require('models/entity');
const sequelize = require('services/sequelize');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const BulkImport = require('models/bulkImport');
const Category = require('models/category');
const { Op } = require('sequelize');

const fileUploadMock = sinon.stub();
fileUploadMock.returns(fileUploadMock);

const EntityImport = proxyquire('pages/data-entry-entity/entity-import/EntityImport', {
  'express-fileupload': fileUploadMock
});

let page = {};
let req = {};
let res = {};

describe('pages/data-entry-entity/entity-import/EntityImport', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), redirect: sinon.stub(), render: sinon.stub() };
    req = { cookies: [], user: { id: 1 }, flash: sinon.stub() };

    page = new EntityImport('some path', req, res);
    page.req = req;
    page.res = res;

    sinon.stub(authentication, 'protect').returns([]);

    sinon.stub(validation, 'validateColumns');
    sinon.stub(validation, 'validateItems');
    sinon.stub(validation, 'validateSheetNames');
    sinon.stub(parse, 'parseItems');

    Category.findOne.returns({ parents: [] });
  });

  afterEach(() => {
    authentication.protect.restore();
    validation.validateColumns.restore();
    validation.validateItems.restore();
    validation.validateSheetNames.restore();
    parse.parseItems.restore();
  });

  describe('#isEnabled', () => {
    let sandbox = {};
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be enabled if entityData feature is active', () => {
      sandbox.stub(config, 'features').value({
        entityData: true
      });

      expect(EntityImport.isEnabled).to.be.ok;
    });

    it('should be enabled if missedMilestones feature is active', () => {
      sandbox.stub(config, 'features').value({
        entityData: false
      });

      expect(EntityImport.isEnabled).to.not.be.ok;
    })
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.dataEntryEntity.import);
    });
  });

  describe('#middleware', () => {
    it('only admins are alowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['administrator']),
        fileUploadMock,
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['administrator']);
    });
  });

  describe('#import', async () => {
    const categoryName = 'category';
    const categoryFields = await Category.fieldDefintions(categoryName);

    beforeEach(() => {
      sinon.stub(Entity, 'import');
    });

    afterEach(() => {
      Entity.import.restore();
    });

    it('correctly imports all entities', async () => {
      const entity = 'entity';
      const transaction = sequelize.transaction();

      await page.import(categoryName, [entity]);

      sinon.assert.calledWith(Entity.import, entity, categoryName, categoryFields, { transaction });
      sinon.assert.called(transaction.commit);
    });

    it('rolls back transaction if anything fails', async () => {
      const entity = 'entity';
      const transaction = sequelize.transaction();
      Entity.import.throws(new Error('Some error'));

      let error = {};
      try {
        await page.import(categoryName, [entity]);
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Some error');

      sinon.assert.calledWith(Entity.import, entity, categoryName, categoryFields, { transaction });
      sinon.assert.called(transaction.rollback);
    });
  });

  describe('#validateItems', () => {
    it('validates each item parsed', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const parsedItems = [{ foo: 'bar' }];
      const fields = [{ displayName: 'some name', isRequired: true }];

      validation.validateColumns.returns('validation.validateColumns');
      validation.validateItems.returns('validation.validateItems');

      const response = page.validateItems(items, parsedItems, fields);

      expect(response).to.eql(['validation.validateColumns', 'validation.validateItems']);

      sinon.assert.calledWith(validation.validateColumns, Object.keys(items[0]), [fields[0].displayName], [fields[0].displayName]);
      sinon.assert.calledWith(validation.validateItems, parsedItems, fields);
    });
  });

  describe('#validateEntities', () => {
    it('rejects if no entity found', async () => {
      parse.parseItems.returns([])
      const response = await page.validateEntities();
      expect(response).to.eql({ entityColumnErrors: [{ error: 'No entities found' }] });
    });

    it('returns correct variables', async () => {
      const entityColumnErrors = [{ foo: 'bar' }];
      const entityErrors = [{ baz: 'baz' }];
      const parsedEntities = [{ id: 1 }];

      page.validateItems = () => [entityColumnErrors, entityErrors];
      parse.parseItems.returns(parsedEntities);

      const response = await page.validateEntities();

      expect(response).to.eql({ entityErrors, entityColumnErrors, parsedEntities });
    });
  });

  describe('#validateImport', () => {
    it('returns errors and parsed entities', async () => {
      const data = { id: 1, data: [{}] };

      const entityErrors = ['entityErrors'];
      const entityColumnErrors = ['entityColumnErrors'];
      const parsedEntities = ['parsedEntities'];

      page.validateEntities = () => {
        return { entityErrors, entityColumnErrors, parsedEntities }
      };
      validation.validateSheetNames.returns({ errors: [] });

      const response = await page.validateImport(data);

      const errors = { entityErrors, entityColumnErrors };

      expect(response).to.eql({
        errors,
        entities: parsedEntities,
        importId: data.id
      });
    });
  });

  describe('#finaliseImport', () => {
    it('redirects user if no active import', async () => {
      BulkImport.findOne.returns(false);

      await page.finaliseImport();

      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.bulkUploadFile);
    });

    it('redirects if any errors found when validating import', async () => {
      BulkImport.findOne.returns(true);
      page.validateImport = () => {
        return { errors: { someError: [] } };
      };

      await page.finaliseImport();

      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.import);
    });

    it('redirects with flash if import failed', async () => {
      BulkImport.findOne.returns(true);
      page.validateImport = () => {
        return { errors: {} };
      };
      page.import = () => {
        throw new Error('some error');
      };

      await page.finaliseImport();

      sinon.assert.calledWith(page.req.flash, 'Failed to import data');
      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.import);
    });

    it('redirects to submission success on good import', async () => {
      BulkImport.findOne.returns(true);
      page.validateImport = () => {
        return { errors: {} };
      };
      page.import = () => {};
      page.removeTemporaryBulkImport = () => {};

      await page.finaliseImport();

      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.submissionSuccess);
    });
  });

  describe('#removeTemporaryBulkImport', () => {
    it('removes bulk upload record in db', async () => {
      await page.removeTemporaryBulkImport(1);
      sinon.assert.calledWith(BulkImport.destroy, {
        where: {
          userId: page.req.user.id,
          id: 1,
          category: {
            [Op.not]: 'data-entry-old'
          }
        }
      });
    });
  });

  describe('#cancelImport', () => {
    it('calles #removeTemporaryBulkImport and redirects to upload page', async () => {
      page.removeTemporaryBulkImport = sinon.stub();

      await page.cancelImport();

      sinon.assert.called(page.removeTemporaryBulkImport);
      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.bulkUploadFile);
    });
  });

  describe('#postRequest', () => {
    it('cancels the import if the user requests', async () => {
      sinon.stub(page, 'cancelImport').resolves();
      page.req.body = { cancel: 'cancel', importId: '123' };
      await page.postRequest(req, res);
      sinon.assert.called(page.cancelImport);
    });

    it('imports the file to the system', async () => {
      sinon.stub(page, 'finaliseImport').resolves();
      page.req.body = { import: 'import', importId: '123' };
      await page.postRequest(req, res);
      sinon.assert.called(page.finaliseImport);
    });
  });

  describe('#getRequest', () => {
    it('redirects to upload page if no record found', async () => {
      BulkImport.findOne.returns(false);

      await page.getRequest(req, res);

      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.bulkUploadFile);
    });

    it('validates upload and renders page', async () => {
      BulkImport.findOne.returns({ data: [{ data: [] }] });

      const errors = 'errors';
      const entities = 'entities';
      const importId = 'importId';
      page.validateImport = () => {
        return { errors, entities, importId };
      };
      page.locals = {};

      await page.getRequest(req, res);

      sinon.assert.called(res.render);
    });
  });
});
