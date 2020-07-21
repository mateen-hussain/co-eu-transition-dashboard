const { expect } = require('test/unit/util/chai');
const PageNotFound = require('pages/page-not-found/PageNotFound');

let page = {};
let res = {};
let req = {};

describe('pages/page-not-found/PageNotFound', () => {
  beforeEach(() => {
    page = new PageNotFound('some path', req, res);
  });

  describe('#middleware', () => {
    it('loads correct middleware', () => {
      expect(page.middleware).to.eql([]);
    });
  });
});