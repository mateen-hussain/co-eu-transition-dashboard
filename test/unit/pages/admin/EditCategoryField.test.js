const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const CategoryField = require('models/categoryField');
const EditCategoryField = require('pages/admin/edit-category-field/EditCategoryField');
const jwt = require('services/jwt');
const setCategoryToLocals = require('middleware/setCategoryToLocals');

let page = {};
let res = {};
let req = {};

describe('pages/admin/edit-category-field/EditCategoryField', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), render: sinon.stub(), redirect: sinon.stub(), cookie: sinon.stub(), locals: { category: { name: 'category', id: 1 } } };
    req = { cookies: [], user: {} };
    page = new EditCategoryField('some path', req, res);
    page.req = req;
    page.res = res;

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(jwt, 'restoreData').returns();
  });

  afterEach(() => {
    authentication.protect.restore();
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.categoryField);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url with params', () => {
      expect(page.pathToBind).to.eql(`${paths.admin.categoryField}/:categoryId/:id(\\d+)?/:summary(summary)?/:successful(successful)?`);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash,
        setCategoryToLocals
      ]);

      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });

  describe('#category', () => {
    it('returns category from locals', () => {
      expect(page.category).to.eql({ name: 'category', id: 1 });
    });
  });

  describe('#editMode', () => {
    it('returns true when in edit mode', () => {
      page.req.params = { id: 'someid' };
      expect(page.editMode).to.be.ok;
    });

    it('returns false when not in edit mode', () => {
      expect(page.editMode).to.be.not.ok;
    });
  });

  describe('#summaryMode', () => {
    it('returns true when in summary mode', () => {
      page.req.params = { summary: 'summary' };
      expect(page.summaryMode).to.be.ok;
    });

    it('returns false when not in summary mode', () => {
      expect(page.summaryMode).to.be.not.ok;
    });
  });

  describe('#getRequest', () => {
    it('runs setdata function', async () => {
      page.setData = sinon.stub().resolves();

      await page.getRequest(req, res);

      sinon.assert.called(page.setData)
    });

    it('clears data on successful page', async () => {
      page.clearData = sinon.stub();
      page.successfulMode = true;

      await page.getRequest(req, res);

      sinon.assert.calledOnce(page.clearData);
    });
  });

  describe('#next', () => {
    it('redirects to successful page if in summary mode and new field', async () => {
      page.req.params = { summary: 'summary' };
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/1/successful`);
    });

    it('redirects to successful page if in summary mode and editing field', async () => {
      page.req.params = { summary: 'summary', id: 'someid' };
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/1/someid/successful`);
    });

    it('redirects to summary page if editing field', async () => {
      page.req.params = { id: 'someid' };
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/1/someid/summary`);
    });

    it('redirects to summary page if adding field', async () => {
      page.req.params = {};
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/1/summary`);
    });
  });

  describe('#saveFieldToDatabase', () => {
    it('saves any edits to database', async () => {
      page.clearData = sinon.stub();
      page.next = sinon.stub();
      page.data = { };
      await page.saveFieldToDatabase();

      sinon.assert.calledWith(CategoryField.upsert, { categoryId: 1 });
      sinon.assert.calledOnce(page.next);
    });

    it('santizes field name', async () => {
      page.clearData = sinon.stub();
      page.next = sinon.stub();
      jwt.restoreData.returns({ EditCategoryField: { categoryId: 1, id: 1, foo: 'bar', displayName: 'some name (&(&(FS^%$%@&' } });

      await page.saveFieldToDatabase();

      sinon.assert.calledWith(CategoryField.upsert, { categoryId: 1, id: 1, foo: 'bar', displayName: 'some name (&(&(FS^%$%@&', name: 'somenameFS' });
      sinon.assert.calledOnce(page.next);
    });

    it('catches any errors and returns to user', async () => {
      const error = new Error('some error');
      CategoryField.upsert.throws(error);

      page.req.flash = sinon.stub();
      page.req.originalUrl = 'someurl';

      await page.saveFieldToDatabase();

      sinon.assert.calledWith(req.flash, `Error when creating / editing field: Error: some error`);
      sinon.assert.calledWith(res.redirect, page.req.originalUrl);
    });
  });

  describe('#isValid', () => {
    let body = {};

    beforeEach(() => {
      body = {
        type: 'some text',
        displayName: 'some text',
        importColumnName: 'some text',
        description: 'some text'
      }
    });

    it('returns true if all valid', () => {
      expect(page.isValid(body)).to.be.ok;
    });

    it('returns false if no display name', () => {
      body.displayName = '';
      expect(page.isValid(body)).to.not.be.ok;
    });

    it('returns false if no description', () => {
      body.description = '';
      expect(page.isValid(body)).to.not.be.ok;
    });

    it('returns true if type is group and valid options', () => {
      body.type = 'group';
      body.config = { options: ['1', '2', '3'] };
      expect(page.isValid(body)).to.be.ok;
    });

    it('returns false if type is group no valid options', () => {
      body.type = 'group';
      body.config = { options: [''] };
      expect(page.isValid(body)).to.not.be.ok;
    });
  })

  describe('#setData', () => {
    beforeEach(() => {
      sinon.stub(page, 'saveData');
      sinon.stub(page, 'clearData');
    });

    it('sets data if in edit mode', async () => {
      page.req.params = { id: 'someid' };
      CategoryField.findOne.returns({ foo: 'bar' });

      await page.setData();

      sinon.assert.calledWith(page.saveData, { foo: 'bar' });
      sinon.assert.notCalled(page.clearData);
    });

    it('sets data if in edit mode and no id set', async () => {
      page.req.params = { id: 1 };
      page.data = {};
      CategoryField.findOne.returns({ foo: 'bar' });

      await page.setData();

      sinon.assert.calledWith(page.saveData, { foo: 'bar' });
      sinon.assert.notCalled(page.clearData);
    });

    it('sets data if in edit mode and id set but does not match param', async () => {
      page.req.params = { id: 1 };
      page.data = { id: 2 };
      CategoryField.findOne.returns({ foo: 'bar' });

      await page.setData();

      sinon.assert.calledWith(page.saveData, { foo: 'bar' });
      sinon.assert.notCalled(page.clearData);
    });

    it('does not set data id is set in data', async () => {
      await page.setData();

      sinon.assert.notCalled(page.saveData);
      sinon.assert.calledOnce(page.clearData);
    });
  });
});