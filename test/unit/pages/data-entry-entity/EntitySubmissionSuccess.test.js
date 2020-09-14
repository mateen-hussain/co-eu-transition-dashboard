const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const jwt = require('services/jwt');
const authentication = require('services/authentication');
const { clearCache } = require('services/nodeCache');

let page = {};
let EntitySubmissionSuccess;

describe('pages/data-entry-entity/entity-submission-success/EntitySubmissionSuccess', () => {
  beforeEach(() => {
    EntitySubmissionSuccess = require('pages/data-entry-entity/entity-submission-success/EntitySubmissionSuccess');

    const res = { cookies: sinon.stub() };

    const req = { cookies: [] };

    page = new EntitySubmissionSuccess('some path', req, res);

    sinon.stub(jwt, 'restoreData');

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    jwt.restoreData.restore();
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

    it('should be enabled if entityData feature is active', () => {
      sandbox.stub(config, 'features').value({
        entityData: true
      });

      expect(EntitySubmissionSuccess.isEnabled).to.be.ok;
    });

    it('should be enabled if missedMilestones feature is active', () => {
      sandbox.stub(config, 'features').value({
        entityData: false
      });

      expect(EntitySubmissionSuccess.isEnabled).to.not.be.ok;
    })
  });

  it('only uploaders are allowed to access this page and clears internal cache', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['uploader']),
      clearCache
    ]);

    sinon.assert.calledWith(authentication.protect, ['uploader']);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(config.paths.dataEntryEntity.submissionSuccess);
    });
  });
});
