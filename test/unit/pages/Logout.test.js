const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');

let page = {};
let res = {}

describe('pages/logout/Logout', () => {
  beforeEach(() => {
    const Logout = require('pages/logout/Logout');

    res = { redirect: sinon.stub(), clearCookie: sinon.stub() };

    const req = { cookies: [] };

    page = new Logout('some path', req, res);

  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.authentication.logout);
    });
  });
});
