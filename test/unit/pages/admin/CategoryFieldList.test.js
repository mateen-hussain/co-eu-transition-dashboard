const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const Category = require('models/category');
const CategoryFieldList = require('pages/admin/category-field-list/CategoryFieldList');
const jwt = require('services/jwt');
const setCategoryToLocals = require('middleware/setCategoryToLocals');

let page = {};
let res = {};
let req = {};

describe('pages/admin/category-field-list/CategoryFieldList', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), render: sinon.stub(), redirect: sinon.stub(), cookie: sinon.stub(), locals: { category: 'category' } };
    req = { cookies: [], user: {} };
    page = new CategoryFieldList('some path', req, res);
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
      expect(page.url).to.eql(paths.admin.categoryFieldList);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url', () => {
      expect(page.pathToBind).to.eql(`${page.url}/:categoryId/:editMode(edit)?`);
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
      expect(page.category).to.eql('category');
    });
  });

  describe('#getFields', () => {
    it('gets fields for given category', async () => {
      Category.fieldDefinitions = sinon.stub().returns('test');
      const fields = await page.getFields();
      expect(fields).to.eql('test');
    });
  });

  describe('#editMode', () => {
    it('returns true when in edit mode', () => {
      page.req.params = { editMode: 'editMode' };
      expect(page.editMode).to.be.ok;
    });

    it('returns false when not in edit mode', () => {
      expect(page.editMode).to.be.not.ok;
    });
  });
});