const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const notify = require('services/notify');
const flash = require('middleware/flash');
const User = require('models/user');
const UserManagementAuthentication = require('pages/admin/user-management/authentication/UserManagementAuthentication');

let page = {};


describe('pages/admin/user-management/authentication/UserManagementAuthentication', () => {
  beforeEach(() => {
    const res = { cookies: sinon.stub(), redirect: sinon.stub() };
    const req = { cookies: [], params: {}, flash: sinon.stub(), originalUrl: 'some-url' };

    page = new UserManagementAuthentication('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.userManagementAuthentication);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });

  describe('#successMode', () => {
    it('returns true if in success mode', () => {
      page.req.params = { success: 'success' };

      expect(page.successMode).to.be.ok;
    });

    it('returns false if not in success mode', () => {
      page.req.params = {};

      expect(page.successMode).to.not.be.ok;
    });
  });

  describe('#getUser', () => {
    it('gets user details', async () => {
      page.req.params.userId = 1;

      await page.getUser();

      sinon.assert.calledWith(User.findOne, {
        where: {
          id: page.req.params.userId
        }
      });
    });
  });

  describe('#createTemporaryPassword', () => {
    it('generates a random password', async () => {
      const password = page.createTemporaryPassword();
      const passwordCompare = page.createTemporaryPassword();

      expect(password.length).to.eql(32);
      expect(password).to.not.eql(passwordCompare);
    });
  });

  describe('#resetUserAuthentication', () => {
    it('reset users password', async () => {
      const req = { body: {} };
      const user = {
        email: 'email@email.com',
        save: sinon.stub()
      };

      const temporaryPassword = page.createTemporaryPassword();
      await page.resetUserAuthentication(req, user, temporaryPassword);

      expect(user.hashedPassphrase.length).to.eql(60);
      expect(user.mustChangePassword).to.be.ok;
      expect(user.loginAttempts).to.eql(0);
      expect(user.twofaSecret).to.be.undefined;

      sinon.assert.called(user.save);
    });

    it('resets users password and forces TFA setup again', async () => {
      const req = { body: { 'reset-tfa': 'yes' } };
      const user = {
        email: 'email@email.com',
        save: sinon.stub()
      };

      const temporaryPassword = page.createTemporaryPassword();
      await page.resetUserAuthentication(req, user, temporaryPassword);

      expect(user.hashedPassphrase.length).to.eql(60);
      expect(user.mustChangePassword).to.be.ok;
      expect(user.loginAttempts).to.eql(0);
      expect(user.twofaSecret).to.eql(null);

      sinon.assert.called(user.save);
    });
  });

  
  describe('#postRequest', () => {
    const password = 'password';
    const user = { email: 'some@email.com', id: 1, hashedPassphrase: password };

    beforeEach(() => {
      page.getUser = sinon.stub().returns(user);
      page.resetUserAuthentication = sinon.stub();
      page.notifyUser = sinon.stub();
      page.createTemporaryPassword = sinon.stub().returns(password);
      sinon.stub(notify,'sendEmailWithTempPassword').returns();
    });

    afterEach(()=>{
      notify.sendEmailWithTempPassword.restore()
    })

    it('orchastrates reseting user authentication', async () => {
      await page.postRequest(page.req, page.res);

      sinon.assert.called(page.createTemporaryPassword);
      sinon.assert.called(page.getUser);
      sinon.assert.calledWith(page.resetUserAuthentication, page.req, user, password);
      sinon.assert.calledWith(notify.sendEmailWithTempPassword, {
        email: user.email,
        userId: user.id,
        password: user.hashedPassphrase
      });

      sinon.assert.calledWith(page.res.redirect, `${page.req.originalUrl}/success`);
    });

    it('redirects to original url if error and sets error to flash', async () => {
      page.getUser.rejects(new Error('some error'));

      await page.postRequest(page.req, page.res);

      sinon.assert.calledWith(page.req.flash, 'some error');
      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
    });
  });
});
