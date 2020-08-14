const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const authentication = require('services/authentication');

let page = {};
let getDepartmentsWithProjects = {};

describe('pages/upcoming-milestones/UpcomingMilestones', () => {
  beforeEach(() => {
    const UpcomingMilestones = require('pages/upcoming-milestones/UpcomingMilestones');

    const res = { cookies: sinon.stub() };

    getDepartmentsWithProjects = sinon.stub();

    const req = { cookies: [], user: { getDepartmentsWithProjects } };

    page = new UpcomingMilestones('some path', req, res);

    sinon.stub(jwt, 'restoreData');

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    jwt.restoreData.restore();
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.upcomingMilestones);
    });
  });

  it('only certain users are alowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['uploader', 'admin', 'viewer', 'management'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['uploader', 'admin', 'viewer', 'management']);
  });

  describe('#formatDate', () => {
    it('should format the date', () => {
      expect(page.formatDate('01/01/2020')).to.eql('1st January 2020');
    });
  });

  describe('#filtersFields', () => {
    it('should not return the filters list', () => {
      expect(page.filtersFields).to.eql(['deliveryConfidence', 'category', 'departmentName', 'deliveryTheme', 'impact', 'hmgConfidence']);
    });
  });
});