const Page = require('core/pages/page');
const config = require('config');
const startPage = require('helpers/startPage');
const { ipWhiteList } = require('middleware/ipWhitelist');

class Start extends Page {
  get url() {
    return startPage();
  }

  get middleware() {
    return [
      ipWhiteList,
      ...super.middleware,
    ];
  }

  async handler(req, res) {
    if(req.user.mustChangePassword) {
      return res.redirect(config.paths.authentication.passwordReset);
    }

    if (req.user.roles.some(role => role.name === 'viewer' || role.name === 'static')) {
      return res.redirect(config.paths.readinessOverview);
    }

    return res.redirect(config.paths.allData);
  }
}

module.exports = Start;
