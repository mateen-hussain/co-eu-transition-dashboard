const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const config = require('config');
const logger = require('services/logger');
const jwt = require('services/jwt');

class Login extends Page {
  get url() {
    return paths.authentication.login;
  }

  get middleware() {
    return [ flash ];
  }

  next(user) {
    if(config.features.twoFactorAuth) {
      this.res.redirect(config.paths.authentication.twoFactorAuthentication);
    } else if(user.passwordReset) {
      this.res.redirect(config.paths.authentication.passwordReset);
    } else {
      this.res.redirect(config.paths.allData);
    }
  }

  handleAuthenticationResponse(err, user) {
    if(err) {
      if (err.maximumLoginAttempts) {
        this.req.flash(`Too many incorrect login attempts have been made, you're account is now locked, please contact us.`);
      } else {
        this.req.flash(`Incorrect username and/or password entered`);
      }

      return this.res.redirect(this.url);
    }

    this.req.login(user, {
      session: false
    }, err => {
      if (err) {
        logger.error(err);
        return this.res.redirect(config.paths.authentication.login);
      }

      jwt.saveData(this.req, this.res, { id: user.id, tfa: false });

      this.next(user);
    });
  }

  async postRequest(req, res) {
    authentication.login(
      req,
      res,
      (error, user) => this.handleAuthenticationResponse(error, user)
    );
  }
}

module.exports = Login;
