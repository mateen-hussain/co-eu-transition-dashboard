const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const Start = require('pages/start/Start');

let page = {};
let res = {};
let req = {};

describe('pages/impact-definitions/ImpactDefinitions', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), redirect: sinon.stub() };
    req = { cookies: [], user: { role: 'user' } };

    page = new Start('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.start);
    });
  });

  describe('#handler', () => {
    const originalMissedMilestoneFeature = config.features.missedMilestones;

    afterEach(() => {
      config.features.missedMilestones = originalMissedMilestoneFeature;
    });

    it('redirects to password reset', async() => {
      req.user.passwordReset = true;
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.authentication.passwordReset);
    });

    it('redirects to admin page if user is admin', async() => {
      req.user.role = 'admin';
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.admin.import);
    });

    it('redirects to missedMilestones is feature is active', async() => {
      config.features.missedMilestones = true;
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.missedMilestones);
    });

    it('redirects to all data page if missedMilestones is feature is not active', async() => {
      config.features.missedMilestones = false;
      await page.handler(req, res);
      sinon.assert.calledWith(res.redirect, config.paths.allData);
    });
  });
});
