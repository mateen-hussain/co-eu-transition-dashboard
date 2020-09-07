const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const Theme = require('pages/theme/Theme');
const authentication = require('services/authentication');
const config = require('config');

let page = {};

describe('pages/theme/Theme', () => {
  beforeEach(() => {
    page = new Theme('some path', {}, {});
    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#isEnabled', () => {
    let sandbox = {};
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be enabled if theme feature is active', () => {
      sandbox.stub(config, 'features').value({
        transitionReadinessTheme: true
      });

      expect(Theme.isEnabled).to.be.ok;
    });

    it('should be disabled if theme feature is not active', () => {
      sandbox.stub(config, 'features').value({
        transitionReadinessTheme: false
      });

      expect(Theme.isEnabled).to.not.be.ok;
    })
  })

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.transitionReadinessThemeDetail);
    });
  });

  it('only management are allowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['management_overview'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['management_overview']);
  });

});