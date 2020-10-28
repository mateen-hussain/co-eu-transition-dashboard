const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { sendEmailWithTempPassword } = require('services/notify');
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

  // async notifyUser(user, temporaryPassword) {
  //   if (!config.notify.apiKey) {
  //     throw new Error('No notify API key set');
  //   }

  //   const notifyClient = new NotifyClient(config.notify.apiKey);

  //   try {
  //     await notifyClient.sendEmail(
  //       config.notify.createTemplateKey,
  //       user.email,
  //       {
  //         personalisation: {
  //           password: temporaryPassword,
  //           email: user.email,
  //           link: config.serviceUrl,
  //           privacy_link: config.serviceUrl + "privacy-notice"
  //         },
  //         reference: `${user.id}`
  //       },
  //     );
  //   } catch (error) {
  //     throw get(error, 'error.errors[0]') || { message: "Error sending email with GovNotify" };
  //   }

  //   logger.info(`User ${user.email} reset and sent with password`);
  // }

  async postRequest(req, res) {
    const temporaryPassword = this.createTemporaryPassword();

    try {
      const user = await this.getUser();
      await this.resetUserAuthentication(req, user, temporaryPassword);
      await sendEmailWithTempPassword({ email: user.email, userId:user.id, password: temporaryPassword })
      // await this.notifyUser(user, temporaryPassword);
    } catch (error) {
      req.flash(error.message);
      return res.redirect(this.req.originalUrl);
    }

    return res.redirect(`${this.req.originalUrl}/success`);
  }
}

module.exports = UserManagementAuthentication;