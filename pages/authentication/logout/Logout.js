const Page = require('core/pages/page');
const { paths } = require('config');

class Logout extends Page {
  get url() {
    return paths.authentication.logout;
  }

  async getRequest(req, res) {
    res.clearCookie("jwt");
    res.redirect(paths.authentication.login);
  }
}

module.exports = Logout;