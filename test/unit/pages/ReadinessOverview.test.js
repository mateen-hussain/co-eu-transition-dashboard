const { expect } = require('test/unit/util/chai');
const { paths } = require('config');

let page = {};
let res = {};
let req = {};

describe('pages/readiness-overview/ReadinessOverview', () => {
  beforeEach(() => {
    const ReportingOverview = require('pages/readiness-overview/ReadinessOverview');

    page = new ReportingOverview('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.readinessOverview);
    });
  });
});
