const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const User = require('models/user');
const Role = require('models/role');

let page = {};

describe('pages/admin/user-management/list/UserManagementList', () => {
  beforeEach(() => {
    const UserManagementList = require('pages/admin/user-management/list/UserManagementList');

    const res = { cookies: sinon.stub() };
    const req = { cookies: [] };

    page = new UserManagementList('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.userManagementList);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });

  describe('#getUsers', () => {
    it('gets users with roles', async () => {
      await page.getUsers();

      sinon.assert.calledWith(User.findAll, {
        include: Role
      });
    });
  });
});
