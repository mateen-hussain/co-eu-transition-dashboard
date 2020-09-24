const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const jwt = require('services/jwt');

let page = {};
let res = {};
let req = {};

describe('pages/rayg-definitions/RaygDefinitions', () => {
  beforeEach(() => {
    const ImpactDefinitions = require('pages/rayg-definitions/RaygDefinitions');

    page = new ImpactDefinitions('some path', req, res);

    sinon.stub(jwt, 'restoreData');

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    jwt.restoreData.restore();
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.raygDefinitions);
    });
  });

  it('only viewer are allowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['management'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['management']);
  });
});
