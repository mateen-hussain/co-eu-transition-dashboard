const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const Authentication = require('pages/authentication/Authentication');
const authenticationService = require('services/authentication');
const flash = require('middleware/flash');
const { protectIfNotLoginPage } = require('middleware/authentication');
const jwt = require('services/jwt');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

let page = {};
let req = {};
let res = {};

describe('pages/authentication/Authentication', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), locals: { mode: 'login' } };
    req = { cookies: [], path: '/' };

    page = new Authentication('some path', req, res);

    sinon.stub(authenticationService, 'login').resolves();
    sinon.stub(authenticationService, 'verify2FA').returns(true);
    sinon.stub(jwt, 'restoreData');
    sinon.stub(jwt, 'saveData');
  });

  afterEach(() => {
    authenticationService.login.restore();
    authenticationService.verify2FA.restore();
    jwt.restoreData.restore();
    jwt.saveData.restore();
  });

  describe('#middleware', () => {
    it('loads correct middleware', () => {
      expect(page.middleware).to.eql([
        page.setMode,
        protectIfNotLoginPage,
        flash,
      ]);
    });
  });

  describe('#mode', () => {
    it('return current mode', () => {
      expect(page.mode).to.eql('login');
    });
  });

  describe('#setMode', () => {
    let next = {};
    beforeEach(() => {
      req = { path: '/' };
      res = { redirect: sinon.stub(), locals: {} };
      next = sinon.stub();
    });

    it('sets mode to login', () => {
      req.path = '/';
      page.setMode(req, res, next);
      expect(res.locals.mode).to.eql('login');
      sinon.assert.called(next);
    });

    it('sets mode to register', () => {
      req.path = '/register';
      page.setMode(req, res, next);
      expect(res.locals.mode).to.eql('register');
      sinon.assert.called(next);
    });

    it('sets mode to setup', () => {
      req.path = '/setup';
      page.setMode(req, res, next);
      expect(res.locals.mode).to.eql('setup');
      sinon.assert.called(next);
    });

    it('sets mode to verified', () => {
      req.path = '/verified';
      page.setMode(req, res, next);
      expect(res.locals.mode).to.eql('verified');
      sinon.assert.called(next);
    });

    it('sets mode to verify', () => {
      req.path = '/verify';
      page.setMode(req, res, next);
      expect(res.locals.mode).to.eql('verify');
      sinon.assert.called(next);
    });

    it('redirects login if mode not matched', () => {
      req.path = '/some-random-url';
      page.setMode(req, res, next);
      sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
    });
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(config.paths.authentication.login);
  });

  describe('#verify2FA', () => {
    beforeEach(() => {
      page.req.body = { sixDigit: 'sixDigit' };
      page.req.user = { twofaSecret: 'secret' };
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();

      jwt.restoreData.returns({ Authentication: {} })
    });

    it('redirects if no secret is given', async () => {
      jwt.restoreData.returns({ Authentication: {} });
      delete page.req.user.twofaSecret;

      await page.verify2FA();

      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.login);
    });

    it('redirects and calls flash if user entered incorrect 2FA code', async () => {

      authenticationService.verify2FA.returns(false);

      await page.verify2FA();

      sinon.assert.calledWith(page.req.flash, `Incorrect code entered`);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.verify);
    });

    it('redirects and calls flash if user entered incorrect 2FA code', async () => {
      await page.verify2FA();

      sinon.assert.notCalled(page.req.flash);
      sinon.assert.neverCalledWith(page.res.redirect, config.paths.authentication.login);
      sinon.assert.neverCalledWith(page.res.redirect, config.paths.authentication.verify);
    });
  });

  describe('#verified', () => {
    beforeEach(() => {
      page.req.body = { sixDigit: 'sixDigit' };
      page.req.user = { twofaSecret: 'secret', update: sinon.stub() };
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();

      jwt.restoreData.returns({ Authentication: { } })
    });

    it('redirects to verified if user is registering', async () => {
      jwt.restoreData.returns({ Authentication: { two_factor_temp_secret: 'secret' } });

      await page.verified();

      sinon.assert.calledWith(page.req.user.update, { twofaSecret: 'secret' });
      sinon.assert.calledWith(jwt.saveData, page.req, page.res, { tfa: true });
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.verified);
    });

    it('redirects to entry url if user is already registered', async () => {
      delete page.req.user.twofaSecret;

      await page.verified();

      sinon.assert.calledWith(page.res.redirect, page.entryUrl);
    });
  });

  describe('#entryUrl', () => {
    beforeEach(() => {
      page.req.user = { };
    });

    it('returns import url if user is admin', () => {
      page.req.user = { role: 'admin' };
      expect(page.entryUrl).to.eql(config.paths.admin.import);
    });

    it('returns all-data url', () => {
      page.req.user = { role: 'user' };
      expect(page.entryUrl).to.eql(config.paths.allData);
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      page.res.locals = {};
      res.sendStatus = sinon.stub();
    });

    it('calls authenticationService.login', async () => {
      page.res.locals = { mode: 'login' };

      await page.postRequest(req, res);

      sinon.assert.calledWith(authenticationService.login, req, res);
    });

    it('verfies 2fa', async () => {
      sinon.stub(page, 'verify2FA').resolves();
      page.res.locals = { mode: 'verify' };

      await page.postRequest(req, res);

      sinon.assert.called(page.verify2FA);

      page.verify2FA.restore();
    });

    it('calls method not aloud if mode not valid', async () => {
      page.res.locals = { mode: 'no-valid' };

      await page.postRequest(req, res);

      sinon.assert.calledWith(res.sendStatus, METHOD_NOT_ALLOWED);
    });
  });

  describe('#getQRCode', () => {
    beforeEach(() => {
      sinon.stub(speakeasy, 'generateSecret').returns({
        base32: 'base32',
        otpauth_url: 'otpauth_url'
      });
      sinon.stub(QRCode, 'toDataURL').resolves('qr code url');
      sinon.stub(page, 'saveData');
      page.req.user = {
        email: 'some-email'
      };
    });

    afterEach(() => {
      speakeasy.generateSecret.restore();
      QRCode.toDataURL.restore();
      page.saveData.restore();
    });

    it('returns a qr code for registering', async () => {
      const url = await page.getQRCode();
      sinon.assert.calledWith(speakeasy.generateSecret, { name: `${config.services.tfa.name}:some-email` })
      sinon.assert.calledWith(page.saveData, { two_factor_temp_secret: 'base32' });
      sinon.assert.calledWith(QRCode.toDataURL, 'otpauth_url');

      expect(url).to.eql('qr code url');
    });
  });
});
