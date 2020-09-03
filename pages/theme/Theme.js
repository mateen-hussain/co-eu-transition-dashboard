const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');

class Theme extends Page {
  static get isEnabled() {
    return config.features.theme;
  }

  get url() {
    return paths.theme;
  }

  get middleware() {
    return [
      ...authentication.protect(['management_overview'])
    ];
  }
}

module.exports = Theme;