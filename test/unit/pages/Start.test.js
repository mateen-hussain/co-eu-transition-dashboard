const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const Start = require('pages/start/Start');

let page = {};
let res = {};
let req = {};

describe('pages/start/Start', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), redirect: sinon.stub() };
    req = { cookies: [], user: { roles: [] } };

    page = new Start('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.start);
    });
  });

  describe('#handler', () => {
    it('redirects to password reset', async() => {
      req.user.mustChangePassword = true;
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.authentication.passwordReset);
    });

    it('redirects to all data landing page if it does not have viewer role', async() => {
      req.user.roles = [{ name: 'management' }];
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.allData);
    });

    it('redirects to readiness overview landing page if it has viewer role', async() => {
      req.user.roles = [{ name: 'viewer' }];
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.readinessOverview);
    });
  });
});
