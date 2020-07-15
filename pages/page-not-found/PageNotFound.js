const Page = require('core/pages/page');
const { paths } = require('config');

class PageNotFound extends Page {
  get url() {
    return paths.pageNotFound;
  }

  // page-not-found page does not require user authentication
  get middleware() {
    return [];
  }
}

module.exports = PageNotFound;