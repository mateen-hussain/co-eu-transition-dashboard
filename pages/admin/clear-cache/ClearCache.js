const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const cache = require('services/cache');

class ClearCache extends Page {
  get url() {
    return paths.admin.clearCache;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin'])
    ];
  }

  getRequest(req, res) {
    cache.clear();

    super.getRequest(req, res);
  }
}

module.exports = ClearCache;