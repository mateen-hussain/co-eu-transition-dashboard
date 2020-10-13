const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const ClearCache = require('pages/admin/clear-cache/ClearCache');
const cache = require('services/cache');
const jwt = require('services/jwt');

let page = {};
let res = {};
let req = {};

describe('pages/admin/clear-cache/ClearCache', () => {
  beforeEach(() => {
    res = { render: sinon.stub() };
    req = {};
    page = new ClearCache('some path', req, res);
    page.req = req;
    page.res = res;

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(cache, 'clear');
    sinon.stub(jwt, 'restoreData').returns();
  });

  afterEach(() => {
    authentication.protect.restore();
    cache.clear.restore();
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.clearCache);
    });
  });

  describe('#getRequest', () => {
    it('clears cache', () => {
      page.getRequest(req, res);

      sinon.assert.calledOnce(cache.clear);
    });
  });
});