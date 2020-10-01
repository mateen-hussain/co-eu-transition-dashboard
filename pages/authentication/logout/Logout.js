const Page = require('core/pages/page');
const config = require('config');

class Logout extends Page {
  get url() {
    return config.paths.authentication.logout;
  }

  async getRequest(req, res) {
    res.clearCookie("jwt", { domain: config.cookie.domain })
    res.redirect(config.paths.authentication.login);
  }
}

module.exports = Logout;