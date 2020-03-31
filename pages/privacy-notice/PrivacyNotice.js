const Page = require('core/pages/page');
const { paths } = require('config');

class PrivacyNotice extends Page {
  get url() {
    return paths.privacyNotice;
  }

  //privacy-notice page does not require user authentication
  get middleware() {
    return [];
  }
}

module.exports = PrivacyNotice;
