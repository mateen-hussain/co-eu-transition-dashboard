const Page = require('core/pages/page');
const config = require('config');
const jwt = require('services/jwt');

class Logout extends Page {
  get url() {
    return config.paths.authentication.logout;
  }

  async getRequest(req, res) {
    jwt.clearCookie(res)
    res.redirect(config.paths.authentication.login);
  }
}

module.exports = Logout;