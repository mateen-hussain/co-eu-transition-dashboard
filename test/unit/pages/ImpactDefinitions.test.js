const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');

let page = {};

describe('pages/impact-definitions/ImpactDefinitions', () => {
  beforeEach(() => {
    const ImpactDefinitions = require('pages/impact-definitions/ImpactDefinitions');

    const res = { cookies: sinon.stub() };

    const req = { cookies: [] };

    page = new ImpactDefinitions('some path', req, res);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.impactDefinitions);
    });
  });
});
