const Page = require('core/pages/page');
const { paths } = require('config');

class PrivacyNotice extends Page {
  get url() {
    return paths.privacyNotice;
  }

  get middleware() {
    return [];
  }
}

module.exports = PrivacyNotice;
