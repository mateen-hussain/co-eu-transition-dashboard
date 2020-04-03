const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const TwoFactorAuthentication = require('pages/authentication/two-factor-authentication/TwoFactorAuthentication');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const jwt = require('services/jwt');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

let page = {};
let req = {};
let res = {};

describe('pages/authentication/two-factor-authentication/TwoFactorAuthentication', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), locals: { mode: 'login' }, redirect: sinon.stub() };
    req = { cookies: [], path: '/', user: {} };

    page = new TwoFactorAuthentication('some path', req, res);

    sinon.stub(authentication, 'login').resolves();
    sinon.stub(authentication, 'verify2FA').returns(true);
    sinon.stub(jwt, 'saveData');
    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    authentication.login.restore();
    authentication.verify2FA.restore();
    jwt.saveData.restore();
    jwt.restoreData.restore();
  });

  describe('#middleware', () => {
    it('loads correct middleware', () => {
      expect(page.middleware).to.eql([
        authentication.protectNo2FA,
        flash
      ]);
    });
  });

  describe('#next', () => {
    it('redirects to password reset', () => {
      page.req.user.passwordReset = true;

      page.next();

      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.passwordReset);
    });

    it('redirects to admin page', () => {
      page.req.user.role = 'admin';

      page.next();

      sinon.assert.calledWith(page.res.redirect, config.paths.admin.import);
    });

    it('redirects to all missed milestones page', () => {
      page.next();

      sinon.assert.calledWith(page.res.redirect, config.paths.missedMilestones);
    });
  });

  describe('#mode', () => {
    it('current mode to be register', () => {
      page.req.path = '/register';
      expect(page.mode).to.eql('register');
    });

    it('current mode to be verified', () => {
      page.req.path = '/verified';
      expect(page.mode).to.eql('verified');
    });

    it('current mode to be verify', () => {
      page.req.path = '/';
      page.req.user.twofaSecret = true;
      expect(page.mode).to.eql('verify');
    });

    it('current mode to be verify', () => {
      page.req.path = '/setup';
      page.req.user.twofaSecret = false;
      page.req.user.two_factor_temp_secret = false;
      expect(page.mode).to.eql('setup');
    });
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(config.paths.authentication.twoFactorAuthentication);
  });

  describe('#verify2FA', () => {
    beforeEach(() => {
      page.req.body = { sixDigit: 'sixDigit' };
      page.req.user = { twofaSecret: 'secret' };
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();
    });

    it('redirects if no secret is given', async () => {
      jwt.restoreData.returns({ Authentication: {} });
      delete page.req.user.twofaSecret;

      await page.verify2FA();

      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.login);
    });

    it('redirects and calls flash if user entered incorrect 2FA code', async () => {
      authentication.verify2FA.returns(false);

      await page.verify2FA();

      sinon.assert.calledWith(page.req.flash, `Incorrect code entered`);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.twoFactorAuthenticationVerify);
    });

    it('redirects and calls flash if user entered incorrect 2FA code', async () => {
      await page.verify2FA();

      sinon.assert.notCalled(page.req.flash);
      sinon.assert.neverCalledWith(page.res.redirect, config.paths.authentication.login);
      sinon.assert.neverCalledWith(page.res.redirect, config.paths.authentication.twoFactorAuthenticationVerify);
    });
  });

  describe('#verified', () => {
    beforeEach(() => {
      page.req.body = { sixDigit: 'sixDigit' };
      page.req.user = { twofaSecret: 'secret', update: sinon.stub() };
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();

      jwt.restoreData.returns({ TwoFactorAuthentication: { } })
    });

    it('redirects to verified if user is registering', async () => {
      jwt.restoreData.returns({ TwoFactorAuthentication: { two_factor_temp_secret: 'secret' } });

      await page.verified();

      sinon.assert.calledWith(page.req.user.update, { twofaSecret: 'secret' });
      sinon.assert.calledWith(jwt.saveData, page.req, page.res, { tfa: true });
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.twoFactorAuthenticationVerified);
    });

    it('calls next if verified', async () => {
      delete page.req.user.twofaSecret;

      sinon.stub(page, 'next');

      await page.verified();

      sinon.assert.called(page.next);
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      res.sendStatus = sinon.stub();
    });

    it('verfies 2fa', async () => {
      sinon.stub(page, 'verify2FA').resolves();
      page.req.path = '/verify';
      page.req.user.twofaSecret = true;

      await page.postRequest(req, res);

      sinon.assert.called(page.verify2FA);

      page.verify2FA.restore();
    });

    it('calls method not aloud if mode not valid', async () => {
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
