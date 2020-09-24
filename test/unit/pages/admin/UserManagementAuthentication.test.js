const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const User = require('models/user');
const config = require('config');
const proxyquire = require('proxyquire');

let page = {};

let sendEmailStub = sinon.stub();

const notificationsNodeClientStub = {
  NotifyClient: function() {
    return {
      sendEmail: sendEmailStub
    };
  }
};

describe.only('pages/admin/user-management/authentication/UserManagementAuthentication', () => {
  beforeEach(() => {
    const UserManagementAuthentication = proxyquire('pages/admin/user-management/authentication/UserManagementAuthentication', {
      'notifications-node-client': notificationsNodeClientStub,
    });

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

  describe('#notifyUser', () => {
    beforeEach(() => {
      sendEmailStub.resolves();
    });

    it('if no config.notify.apiKey throw error', async () => {
      page.notifyUser();

      const prevKey = config.notify.apiKey;
      delete config.notify.apiKey;

      let message = '';
      try{
        await page.notifyUser();
      } catch (thrownError) {
        message = thrownError.message;
      }
      expect(message).to.eql('No notify API key set');

      config.notify.apiKey = prevKey;
    });

    it('sends email successfully', async () => {
      const user = {
        id: 1,
        email: 'email@email.com'
      };
      const temporaryPassword = page.createTemporaryPassword();

      await page.notifyUser(user, temporaryPassword);

      sinon.assert.calledWith(sendEmailStub,
        config.notify.createTemplateKey,
        user.email,
        {
          personalisation: {
            password: temporaryPassword,
            email: user.email,
            link: config.serviceUrl,
            privacy_link: config.serviceUrl + "privacy-notice"
          },
          reference: `${user.id}`
        },
      );
    });

    it('throws error if send email fails', async () => {
      const user = {
        id: 1,
        email: 'email@email.com'
      };
      const temporaryPassword = page.createTemporaryPassword();
      sendEmailStub.rejects({
        error: {
          errors: [{
            message: 'some error'
          }]
        }
      });

      let message = '';
      try{
        await page.notifyUser(user, temporaryPassword);
      } catch (thrownError) {
        message = thrownError.message;
      }
      expect(message).to.eql('some error');
    });
  });

  describe('#postRequest', () => {
    const password = 'password';
    const user = { email: 'some@email.com' };

    beforeEach(() => {
      page.getUser = sinon.stub().returns(user);
      page.resetUserAuthentication = sinon.stub();
      page.notifyUser = sinon.stub();
      page.createTemporaryPassword = sinon.stub().returns(password);
    });

    it('orchastrates reseting user authentication', async () => {
      await page.postRequest(page.req, page.res);

      sinon.assert.called(page.createTemporaryPassword);
      sinon.assert.called(page.getUser);
      sinon.assert.calledWith(page.resetUserAuthentication, page.req, user, password);
      sinon.assert.calledWith(page.notifyUser, user, password);

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
