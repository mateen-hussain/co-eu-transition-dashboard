const Page = require('core/pages/page');
const { paths } = require('config');

class ImpactDefinitions extends Page {
  get url() {
    return paths.impactDefinitions;
  }
}

module.exports = ImpactDefinitions;
