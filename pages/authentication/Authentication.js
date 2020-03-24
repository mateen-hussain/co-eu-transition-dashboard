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
const { protectIfNotLoginPage } = require('middleware/authentication');

class Authentication extends Page {

  get url() {
    return paths.authentication.login;
  }

  get paths() {
    return paths;
  }

  get middleware() {
    return [
      this.setMode,
      protectIfNotLoginPage,
      flash,
    ];
  }

  get mode() {
    return this.res.locals.mode;
  }

  setMode(req, res, next) {
    const pathToCompare = req.path === '/' ? paths.authentication.login : `${paths.authentication.login}${req.path}`;
    res.locals = res.locals || {};
    switch(pathToCompare) {
      case paths.authentication.login:
        res.locals.mode = 'login';
        break;
      case paths.authentication.register:
        res.locals.mode = 'register';
        break;
      case paths.authentication.setup:
        res.locals.mode = 'setup';
        break;
      case paths.authentication.verified:
        res.locals.mode = 'verified';
        break;
      case paths.authentication.verify:
        res.locals.mode = 'verify';
        break;
    }

    if (!res.locals.mode) {
      return res.redirect(paths.authentication.login);
    }

    next();
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
      return this.res.redirect(config.paths.authentication.verify);
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

      return this.res.redirect(config.paths.authentication.verified);
    }

    // set tfa flag in JWT token - used to verify user has 2FA
    jwt.saveData(this.req, this.res, { tfa: true });

    this.res.redirect(this.entryUrl);
  }

  get entryUrl() {
    if (this.req.user && this.req.user.role === 'admin') {
      return config.paths.admin.import;
    } else {
      return config.paths.allData;
    }
  }

  async postRequest(req, res) {
    switch(this.mode) {
      case 'login':
        await authentication.login(req, res);
        break;
      case 'verify':
        await this.verify2FA();
        break;
      default:
        res.sendStatus(METHOD_NOT_ALLOWED);
    }
  }

  async getQRCode() {
    const secret = speakeasy.generateSecret({
      name: `Transition Taskforce Dashboard:${this.req.user.email}`
    });

    this.saveData({ two_factor_temp_secret: secret.base32 });

    return await QRCode.toDataURL(secret.otpauth_url);
  }
}

module.exports = Authentication;
