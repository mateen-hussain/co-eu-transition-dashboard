const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const Category = require('models/category');

let page = {};

describe('pages/admin/category-list/CategoryList', () => {
  beforeEach(() => {
    const CategoryList = require('pages/admin/category-list/CategoryList');

    const res = { cookies: sinon.stub() };

    const req = { cookies: [] };

    page = new CategoryList('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(jwt, 'restoreData').returns();
  });

  afterEach(() => {
    authentication.protect.restore();
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.categoryList);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['administrator']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['administrator']);
    });
  });

  describe('#getCategories', () => {
    it('category.findAll is called', async () => {
      await page.getCategories();

      sinon.assert.called(Category.findAll);
    });
  });
});
