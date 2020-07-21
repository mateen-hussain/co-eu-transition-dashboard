const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const PasswordReset = require('pages/authentication/password-reset/PasswordReset');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');

let page = {};
let req = {};
let res = {};

describe('pages/authentication/password-reset/PasswordReset', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), locals: { mode: 'login' }, redirect: sinon.stub() };
    req = { cookies: [], path: '/', user: {}, flash: sinon.stub(), body: {} };

    page = new PasswordReset('some path', req, res);
  });

  describe('#middleware', () => {
    it('loads correct middleware', () => {
      expect(page.middleware.toString()).to.eql([
        ...authentication.protect(['uploader', 'administrator', 'viewer']),
        flash
      ].toString());
    });
  });

  describe('#next', () => {
    it('redirects to start page', () => {
      page.req.user.role = 'viewer';
      expect(page.next).to.eql(config.paths.start);
    });
  });

  describe('#mode', () => {
    it('returns `password-reset-complete`', () => {
      page.req.path = '/reset-complete';
      expect(page.mode).to.eql('password-reset-complete');
    });

    it('returns `password-reset`', () => {
      page.req.path = config.paths.authentication.passwordResetComplete;
      expect(page.mode).to.eql('password-reset');


      page.req.path = '/';
      expect(page.mode).to.eql('password-reset');
    });
  });

  describe('#validatePassword', () => {
    it('passes valid password', () => {
      expect(page.validatePassword('!aS1234567', '!aS1234567')).to.be.undefined;
    });

    it('rejects password if less than 8 characters', () => {
      expect(page.validatePassword('1234567')).to.be.eql('The password must have a minimum of 8 characters');
    });

    it('rejects password doesnt contain nubers', () => {
      expect(page.validatePassword('asgasdoasjdoA!sf')).to.be.eql('The password must contain at least one number');
    });

    it('rejects password doesnt contain lower case charater', () => {
      expect(page.validatePassword('ASFASFASFAS12A!')).to.be.eql('The password must contain at least one lowercase charater');
    });

    it('rejects password doesnt contain an upper case charater', () => {
      expect(page.validatePassword('asd2324124gg!')).to.be.eql('The password must contain at least one uppercase charater');
    });

    it('rejects password doesnt contain a special charater', () => {
      expect(page.validatePassword('asd2324124ggA')).to.be.eql('The password must contain at least one special character');
    });

    it('rejects if passwords dont match', () => {
      expect(page.validatePassword('asd2324124ggA2@', 'asdasfasfasfa')).to.be.eql('The passwords must match');
    });
  });

  describe('#passwordReset', () => {
    beforeEach(() => {
      sinon.stub(page, 'validatePassword').returns();
      sinon.stub(authentication, 'hashPassphrase').resolves('password hash');
      page.req.user.update = sinon.stub();
    });

    afterEach(() => {
      page.validatePassword.restore();
      authentication.hashPassphrase.restore();
    });

    it('fails if current password does not match', async () => {
      sinon.stub(authentication,'authenticateLogin').returns(true);

      await page.passwordReset();

      sinon.assert.calledWith(page.req.flash, "Incorrect password entered");
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.passwordReset);
    });

    it('sets error if password does not pass validation', async () => {
      const notValid = 'Not valid';

      authentication.authenticateLogin = sinon.stub();
      req.body.password = 'password';

      page.validatePassword.returns(notValid);
      await page.passwordReset();

      sinon.assert.calledWith(page.req.flash, notValid);
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.passwordReset);
    });

    it('redirects to password reset complete', async () => {
      req.body.password = 'password';

      await page.passwordReset();

      sinon.assert.calledWith(page.req.user.update, {
        hashedPassphrase: 'password hash',
        mustChangePassword: false
      });
      sinon.assert.calledWith(page.res.redirect, config.paths.authentication.passwordResetComplete);
    });
  });

  describe('#postRequest', () => {
    it('calls #passwordReset if mode is `password-reset`', () => {
      page.req.path = config.paths.authentication.passwordResetComplete;
      sinon.stub(page, 'passwordReset').resolves();

      page.postRequest();

      sinon.assert.called(page.passwordReset);
    });

    it('calls returns method not alloud if any other path', () => {
      page.req.path = '/reset-complete';
      const res = { sendStatus: sinon.stub() };

      page.postRequest({}, res);

      sinon.assert.calledWith(res.sendStatus, METHOD_NOT_ALLOWED);
    });
  });
});
