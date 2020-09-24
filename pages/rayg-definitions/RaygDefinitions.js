const Page = require('core/pages/page');
const { paths } = require('config');

class RaygDefinitions extends Page {
  get url() {
    return paths.raygDefinitions;
  }
}

module.exports = RaygDefinitions;
