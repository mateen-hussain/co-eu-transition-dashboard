const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');
const transitionReadinessData = require('helpers/transitionReadinessData');

class Theme extends Page {
  static get isEnabled() {
    return config.features.transitionReadinessTheme;
  }

  get url() {
    return paths.transitionReadinessThemeDetail;
  }

  get pathToBind() {
    return `${this.url}/:theme/:statement?/:selectedPublicId?`;
  }

  get middleware() {
    return [
      ...authentication.protect(['viewer'])
    ];
  }

  async data() {
    return transitionReadinessData.themeDetail(this.url, this.req);
  }
}

module.exports = Theme;
