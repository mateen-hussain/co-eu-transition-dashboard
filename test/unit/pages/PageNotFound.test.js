const { expect } = require('test/unit/util/chai');
const { paths } = require('config');

let page = {};
let res = {};
let req = {};

describe('pages/page-not-found/PageNotFound', () => {
  beforeEach(() => {
    const PageNotFound = require('pages/page-not-found/PageNotFound');

    page = new PageNotFound('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.pageNotFound);
    });
  });

  describe('#middleware', () => {
    it('loads correct middleware', () => {
      expect(page.middleware).to.eql([]);
    });
  });
});