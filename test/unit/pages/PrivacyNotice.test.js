const { expect } = require('test/unit/util/chai');
const { paths } = require('config');

let page = {};
let res = {};
let req = {};

describe('pages/privacy-notice/PrivacyNotice', () => {
  beforeEach(() => {
    const PrivacyNotice = require('pages/privacy-notice/PrivacyNotice');

    page = new PrivacyNotice('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.privacyNotice);
    });
  });
});
