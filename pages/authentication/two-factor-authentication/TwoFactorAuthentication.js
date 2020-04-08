const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jwt = require('services/jwt');
const config = require('config');
const flash = require('middleware/flash');
const logger = require('services/logger');
const startPage = require('helpers/startPage');

class TwoFactorAuthentication extends Page {
  get url() {
    return paths.authentication.twoFactorAuthentication;
  }

  get middleware() {
    return [
      authentication.protectNo2FA,
      flash,
    ];
  }

  next() {
    if(this.req.user.passwordReset) {
      this.res.redirect(config.paths.authentication.passwordReset);
    } else {
      return this.res.redirect(startPage());
    }
  }

  get mode() {
    const pathToCompare = this.req.path === '/' ? paths.authentication.twoFactorAuthentication : `${paths.authentication.twoFactorAuthentication}${this.req.path}`;

    switch(pathToCompare) {
    case paths.authentication.twoFactorAuthenticationRegister:
      return 'register';
    case paths.authentication.twoFactorAuthenticationVerified:
      return 'verified';
    default:
      if (!this.req.user.twofaSecret && !this.data.two_factor_temp_secret) {
        return 'setup';
      } else {
        return 'verify';
      }
    }
  }

  async verify2FA() {
    const secret = this.data.two_factor_temp_secret || this.req.user.twofaSecret;
    if ( !secret ) {
      logger.error('User has no 2FA secret');
      return this.res.redirect(config.paths.authentication.login);
    }

    const verified = authentication.verify2FA(
      secret,
      this.req.body.sixDigit
    );

    if (!verified) {
      logger.error('User entered incorrect 2FA code');
      this.req.flash(`Incorrect code entered`);
      return this.res.redirect(config.paths.authentication.twoFactorAuthenticationVerify);
    }

    this.verified();
  }

  async verified() {
    if (this.data.two_factor_temp_secret) {
      // save secret to user in database
      await this.req.user.update({
        twofaSecret: this.data.two_factor_temp_secret
      });

      // remove any temporary secrets
      this.saveData({}, false);

      // set tfa flag in JWT token - used to verify user has 2FA
      jwt.saveData(this.req, this.res, { tfa: true });

      return this.res.redirect(config.paths.authentication.twoFactorAuthenticationVerified);
    }

    // set tfa flag in JWT token - used to verify user has 2FA
    jwt.saveData(this.req, this.res, { tfa: true });

    this.next();
  }

  async postRequest(req, res) {
    switch(this.mode) {
    case 'verify':
      await this.verify2FA();
      break;
    default:
      res.sendStatus(METHOD_NOT_ALLOWED);
    }
  }

  async getQRCode() {
    const secret = speakeasy.generateSecret({
      name: `${config.services.tfa.name}:${this.req.user.email}`
    });

    this.saveData({ two_factor_temp_secret: secret.base32 });

    return await QRCode.toDataURL(secret.otpauth_url);
  }
}

module.exports = TwoFactorAuthentication;
