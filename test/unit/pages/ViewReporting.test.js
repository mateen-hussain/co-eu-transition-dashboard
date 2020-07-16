const { expect } = require('test/unit/util/chai');
const { paths } = require('config');

let page = {};
let res = {};
let req = {};

describe('pages/view-reporting/ViewReporting', () => {
  beforeEach(() => {
    const ViewReporting = require('pages/view-reporting/ViewReporting');

    page = new ViewReporting('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.viewReporting);
    });
  });
});
