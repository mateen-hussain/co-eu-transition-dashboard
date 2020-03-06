const Page = require('core/pages/page');
const { paths } = require('config');
const { login } = require('services/authentication');

class Authentication extends Page {
  get url() {
    return paths.authentication;
  }

  get requireAuth() {
    return false;
  }

  async postRequest(req, res) {
    await login(req, res);
  }
}

module.exports = Authentication;