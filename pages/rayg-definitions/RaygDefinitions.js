const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');

class RaygDefinitions extends Page {
  get url() {
    return paths.raygDefinitions;
  }

  get middleware() {
    return [
      ...authentication.protect(['viewer'])
    ];
  }
}

module.exports = RaygDefinitions;
