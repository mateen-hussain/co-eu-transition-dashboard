const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const { ipWhiteList } = require('middleware/ipWhitelist');

let page = {};
let res = {};
let req = {};

describe('pages/readiness-overview/ReadinessOverview', () => {
  beforeEach(() => {
    const ReportingOverview = require('pages/readiness-overview/ReadinessOverview');

    page = new ReportingOverview('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.readinessOverview);
    });
  });

  describe('#middleware', () => {
    it('only viewer and static roles can access this page', () => {
      expect(page.middleware).to.eql([
        ipWhiteList,
        ...authentication.protect(['viewer', 'static'])
      ]);

      sinon.assert.calledWith(authentication.protect, ['viewer', 'static']);
    });
  });
});
