const Page = require('core/pages/page');
const { paths } = require('config');

class PrivacyNotice extends Page {
  get url() {
    return paths.privacyNotice;
  }
}

module.exports = PrivacyNotice;
