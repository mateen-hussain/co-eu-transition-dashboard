const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const authentication = require('services/authentication');

let page = {};

describe('pages/data-entry-entity/entity-submission-success/EntitySubmissionSuccess', () => {
  beforeEach(() => {
    const EntitySubmissionSuccess = require('pages/data-entry-entity/entity-submission-success/EntitySubmissionSuccess');

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

  it('only admins are alowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['administrator'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['administrator']);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.submissionSuccess);
    });
  });
});
