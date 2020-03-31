const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const Login = require('pages/authentication/login/Login');
const flash = require('middleware/flash');
const jwt = require('services/jwt');
const logger = require('services/logger');

let page = {};
let req = {};
let res = {};

describe('pages/authentication/login/Login', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), locals: { mode: 'login' } };
    req = { cookies: [], path: '/' };

    page = new Login('some path', req, res);

    sinon.stub(jwt, 'saveData');
    sinon.stub(logger, 'error');
  });

  afterEach(() => {
    jwt.saveData.restore();
    logger.error.restore();
  });

  describe('#middleware', () => {
    it('loads correct middleware', () => {
      expect(page.middleware).to.eql([ flash ]);
    });
  });

  describe('#next', () => {
    const twoFASetting = config.features.twoFactorAuth;

    afterEach(() => {
      config.features.twoFactorAuth = twoFASetting;
    });

    it('redirects if 2FA enabaled', () => {
      config.features.twoFactorAuth = true;
      page.res.redirect = sinon.stub();

      page.next({});

      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.twoFactorAuthentication);
    });

    it('redirects if user passwordReset is true', () => {
      config.features.twoFactorAuth = false;
      page.res.redirect = sinon.stub();

      const user = { passwordReset: true };
      page.next(user);

      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.passwordReset);
    });

    it('default redirect', () => {
      config.features.twoFactorAuth = false;
      page.res.redirect = sinon.stub();

      const user = {};
      page.next(user);

      sinon.assert.calledWith(page.res.redirect, config.paths.allData);
    });
  });

  describe('#handleAuthenticationResponse', () => {
    beforeEach(() => {
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();
    });

    it('sets correct error and redirects to this page if user is blocked out', () => {
      const err = { maximumLoginAttempts: true };
      page.handleAuthenticationResponse(err);
      sinon.assert.calledWith(page.req.flash, `Too many incorrect login attempts have been made, you're account is now locked, please contact us.`);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.login);
    });

    it('sets correct error and redirects to this page if user is blocked out', () => {
      const err = {};
      page.handleAuthenticationResponse(err);
      sinon.assert.calledWith(page.req.flash, `Incorrect username and/or password entered`);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.login);
    });

    it('redirects to login page if error with login', () => {
      const error = new Error('some error');
      page.req.login = sinon.stub().callsArgWith(2, error);

      const user = {};
      page.handleAuthenticationResponse(null, user);

      sinon.assert.calledWith(logger.error, error);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.login);
    })

    it('saves jwt token and calles next', () => {
      page.next = sinon.stub();
      page.req.login = sinon.stub().callsArg(2);

      const user = { id: 1 };
      page.handleAuthenticationResponse(null, user);

      sinon.assert.calledWith(jwt.saveData, page.req, page.res, { id: user.id, tfa: false });
      sinon.assert.calledWith(page.next, user);
    })
  });
});
