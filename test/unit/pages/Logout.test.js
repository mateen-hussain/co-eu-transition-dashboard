const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const jwt = require('services/jwt');

let page = {};
let res = {}

describe('pages/logout/Logout', () => {
  beforeEach(() => {
    const Logout = require('pages/logout/Logout');

    res = { redirect: sinon.stub(), clearCookie: sinon.stub() };

    const req = { cookies: [] };

    page = new Logout('some path', req, res);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.authentication.logout);
    });
  });
});
