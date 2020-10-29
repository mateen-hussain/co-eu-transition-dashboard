const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const notify = require('services/notify');
const flash = require('middleware/flash');
const User = require('models/user');
const randomString = require('randomstring');

class UserManagementAuthentication extends Page {
  get url() {
    return paths.admin.userManagementAuthentication;
  }

  get pathToBind() {
    return `${this.url}/:userId/:success(success)?`;
  }

  get successMode() {
    return this.req.params && this.req.params.success;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      flash
    ];
  }

  async getUser() {
    return await User.findOne({
      where: {
        id: this.req.params.userId
      }
    });
  }

  createTemporaryPassword() {
    return randomString.generate({
      readable: true
    });
  }

  async resetUserAuthentication(req, user, temporaryPassword) {
    user.hashedPassphrase = await authentication.hashPassphrase(temporaryPassword);
    user.mustChangePassword = true;
    user.loginAttempts = 0;

    if(req.body && req.body['reset-tfa'] && req.body['reset-tfa'] === 'yes') {
      user.twofaSecret = null;
    }

    await user.save();
  }

  async postRequest(req, res) {
    const temporaryPassword = this.createTemporaryPassword();

    try {
      const user = await this.getUser();
      await this.resetUserAuthentication(req, user, temporaryPassword);
      await notify.sendEmailWithTempPassword({ 
        email: user.email, 
        userId: user.id, 
        password: temporaryPassword 
      })
    } catch (error) {
      req.flash(error.message);
      return res.redirect(this.req.originalUrl);
    }

    return res.redirect(`${this.req.originalUrl}/success`);
  }
}

module.exports = UserManagementAuthentication;