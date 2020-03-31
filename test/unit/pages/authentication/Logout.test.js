const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');

let page = {};
let res = {}
let req = {}

describe('pages/logout/Logout', () => {
  beforeEach(() => {
    const Logout = require('pages/authentication/logout/Logout');

    res = { redirect: sinon.stub(), clearCookie: sinon.stub() };

    page = new Logout('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.authentication.logout);
    });
  });

  describe('#getRequest', () => {
    it('clears the cookie and redirects', () => {
      page.getRequest(req, res);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.login);
      sinon.assert.calledWith(page.res.clearCookie, "jwt");
    });
  });
});
