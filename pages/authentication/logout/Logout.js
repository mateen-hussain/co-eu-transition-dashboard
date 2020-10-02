const Page = require('core/pages/page');
const { paths } = require('config');
const jwt = require('services/jwt');

class Logout extends Page {
  get url() {
    return paths.authentication.logout;
  }

  async getRequest(req, res) {
    jwt.clearCookie(res)
    res.redirect(paths.authentication.login);
  }
}

module.exports = Logout;