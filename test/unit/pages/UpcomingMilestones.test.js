const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');

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
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.upcomingMilestones);
    });
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