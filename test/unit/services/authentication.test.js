const { expect, sinon } = require('test/unit/util/chai');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const config = require('config');
const logger = require('services/logger');
const bcrypt = require('bcrypt');
const User = require('models/user');

let passportLocalStrategyStub = {};
let passportJWTStrategyStub = {};
let passportStub = {};
let authentication = {};

const user = {
  email: 'email',
  password: 'password',
  hashedPassphrase: 'password',
  role: 'user',
  id: 1,
  increment: sinon.stub().resolves(),
  update: sinon.stub().resolves()
};

describe('services/authentication', () => {
  beforeEach(() => {
    passportLocalStrategyStub = sinon.stub().returns(0);
    passportJWTStrategyStub = sinon.stub().returns(0);
    passportStub = {
      use: sinon.stub(),
      authenticate: sinon.stub()
    };

    sinon.stub(bcrypt, 'compare');
    sinon.stub(bcrypt, 'hash');

    authentication = proxyquire('services/authentication', {
      'passport-local': { Strategy: passportLocalStrategyStub },
      'passport-jwt': { Strategy: passportJWTStrategyStub },
      'passport': passportStub
    });
  });

  afterEach(() => {
    bcrypt.compare.restore();
    bcrypt.hash.restore();
  });

  describe('#hashPassphrase', () => {
    it('encrypts a passphrase', () => {
      const password = 'password';
      bcrypt.hash.returns(password);
      const hash = authentication.hashPassphrase(password);
      sinon.assert.calledWith(bcrypt.hash, password, config.bcrypt.saltRounds)
      expect(hash).to.eql(password);
    });

    it('handles an error', () => {
      bcrypt.hash.callsFake(()  => {
        throw new Error('some error');
      });
      expect(() => authentication.hashPassphrase('password')).to.throw('Bcrypt error: Error: some error');
    });
  })

  describe('strategies', () => {
    it('attaches local strategy', () => {
      sinon.assert.calledWith(passportLocalStrategyStub, {
        usernameField: 'email',
        passwordField: 'password'
      }, authentication.authenticateLogin);

      sinon.assert.calledWith(passportStub.use, new passportLocalStrategyStub());
    });

    it('attaches jwt strategy', () => {
      sinon.assert.calledWith(passportJWTStrategyStub, {
        jwtFromRequest: jwt.token,
        secretOrKey: config.cookie.secret
      }, authentication.authenticateUser);

      sinon.assert.calledWith(passportStub.use, new passportJWTStrategyStub());
    });

    describe('#authenticateLogin', () => {
      let authenticateLoginCallback = {}

      describe('correct credentials', () => {
        beforeEach(async () => {
          user.loginAttempts = 0;
          user.increment = sinon.stub();
          user.update = sinon.stub();

          User.findOne.resolves(user);
          bcrypt.compare.resolves(true);

          authenticateLoginCallback = sinon.stub();

          await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);
        });

        it('correctly searches database', () => {
          sinon.assert.calledWith(User.findOne, {
            where: { email: user.email }
          });
        });

        it('checks password', () => {
          sinon.assert.calledWith(bcrypt.compare, user.password, user.password);
        });

        it('updates users login attempts', () => {
          sinon.assert.calledWith(user.update, { loginAttempts: 0 });
        });

        it('returns user', () => {
          sinon.assert.calledWith(authenticateLoginCallback, null, user);
        });
      });

      describe('incorrect credentials', () => {
        beforeEach(async () => {
          user.increment = sinon.stub();
          user.loginAttempts = 1;
          User.findOne.resolves(user);
          bcrypt.compare.resolves(false);

          authenticateLoginCallback = sinon.stub();

          await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);
        });

        it('correctly searches database', () => {
          sinon.assert.calledWith(User.findOne, {
            where: { email: user.email }
          });
        });

        it('checks password and increases login attempt', () => {
          sinon.assert.calledWith(bcrypt.compare, user.password, user.password);
          sinon.assert.calledOnce(user.increment);
        });

        it('throws error with remaining login attempts', () => {
          const error = authenticateLoginCallback.getCall(0).args[0];
          expect(error.message).to.eql('Password doest not match');
          expect(error.loginAttempts).to.eql(2);
        });
      });

      it('no user found', async () => {
        User.findOne.resolves();
        authenticateLoginCallback = sinon.stub();

        await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);

        const error = authenticateLoginCallback.getCall(0).args[0];
        expect(error.message).to.eql('No user found');
      });

      it('increments login attempts', async () => {
        user.loginAttempts = 3;
        User.findOne.resolves(user);

        authenticateLoginCallback = sinon.stub();

        await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);

        const error = authenticateLoginCallback.getCall(0).args[0];
        expect(error.message).to.eql('Maximum login attempts exeeded');
        expect(error.loginAttempts).to.eql(3);
      });
    });

    describe('#authenticateUser', () => {
      const jwtPayload = { id: 1 };

      it('returns found user', async () => {
        User.findOne.resolves({ id: user.id, role: user.role });
        const authenticateUserCallback = sinon.stub();

        await authentication.authenticateUser(jwtPayload, authenticateUserCallback);

        sinon.assert.calledWith(User.findOne, {
          where: { id: jwtPayload.id }
        });

        sinon.assert.calledWith(authenticateUserCallback, null, { id: user.id, role: user.role });
      });

      it('rejects on findone error', async () => {
        const error = new Error('some error...');
        User.findOne.rejects(error);
        const authenticateUserCallback = sinon.stub();

        await authentication.authenticateUser(jwtPayload, authenticateUserCallback);

        sinon.assert.calledWith(User.findOne, {
          where: { id: jwtPayload.id }
        });

        sinon.assert.calledWith(authenticateUserCallback, error);
      });
    });
  });

  describe('#protect', () => {
    it('is created correctly', () => {
      const middleware = authentication.protect();

      sinon.assert.calledWith(passportStub.authenticate, 'jwt', {
        session: false,
        failureRedirect: config.paths.authentication.login
      });

      expect(middleware[0]).to.eql(passportStub.authenticate());
      expect(middleware[1].name).to.eql('check2fa');
      expect(middleware[2].name).to.eql('checkRole');
      expect(middleware[3].name).to.eql('updateCookieExpiration');
    });

    describe('handle roles', () => {
      it('allows defined role', () => {
        const middleware = authentication.protect(['user']);
        const req = { user: { role: 'user' } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[2](req, res, next);

        sinon.assert.called(next);
      });

      it('allows mulitple defined roles', () => {
        const middleware = authentication.protect(['admin', 'user']);
        const req = { user: { role: 'user' } };
        const next = sinon.stub();

        middleware[2](req, {}, next);

        sinon.assert.called(next);
      });

      it('redirects to login if no user assigned to req', () => {
        const middleware = authentication.protect(['user']);
        const req = { };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[2](req, res, next);

        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
      });

      it('redirects to login if user role does not match', () => {
        const middleware = authentication.protect(['admin']);
        const req = { user: { role: 'user' } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[2](req, res, next);

        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
      });
    });

    describe('check 2fa', () => {
      beforeEach(() => {
        sinon.stub(jwt, 'restoreData');
      });

      afterEach(() => {
        jwt.restoreData.restore();
      });

      it('allow if 2fa passed', () => {
        jwt.restoreData.returns({ tfa: true });

        const middleware = authentication.protect(['user']);
        const req = { user: { role: 'user' } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[1](req, res, next);

        sinon.assert.called(next);
      });

      it('redirects if no tfa ', () => {
        jwt.restoreData.returns({ tfa: false });

        const middleware = authentication.protect(['user']);
        const req = { user: { role: 'user' } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[1](req, res, next);

        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
        sinon.assert.notCalled(next);
      });
    });

    it('update cookie expiration', () => {
      sinon.stub(jwt, 'saveData');

      const middleware = authentication.protect(['user']);
      const req = { user: { role: 'user' } };
      const res = { redirect: sinon.stub() };
      const next = sinon.stub();

      middleware[3](req, res, next);

      sinon.assert.calledWith(jwt.saveData, req, res);
      sinon.assert.called(next);

      jwt.saveData.restore();
    });
  });

  describe('#login', () => {
    let req = {
      login: sinon.stub().callsArgWith(2, null)
    };
    let res = {
      redirect: sinon.stub()
    };
    let authenticatWithJwt = {};
    let loginStub = {};

    beforeEach(() => {
      loginStub = sinon.stub().callsArgWith(2, null);
      req = { login: loginStub, user, flash: sinon.stub() };
      res = { redirect: sinon.stub() };

      passportStub.authenticate.returns(() => {
        authenticatWithJwt = passportStub.authenticate.getCall(1).args[2];
      });

      sinon.stub(jwt, 'saveData').returns();
      sinon.stub(logger, 'error');
    });

    afterEach(() => {
      jwt.saveData.restore();
      logger.error.restore();
    });

    it('redirects to 2fa register page', () => {
      authentication.login(req, res);

      authenticatWithJwt(null, user);

      sinon.assert.calledWith(jwt.saveData, req, res, { id: user.id, tfa: false });
      sinon.assert.calledWith(res.redirect, config.paths.authentication.setup);
    });

    describe('bad login', () => {
      it('redirects to login page if error with authenticatWithJwt', () => {
        authentication.login(req, res);

        const error = new Error('some error');

        authenticatWithJwt(error);

        sinon.assert.calledWith(req.flash, `Incorrect username and/or password entered`);
        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
        sinon.assert.notCalled(jwt.saveData);
      });

      it('sets flash error if user locked out', () => {
        authentication.login(req, res);

        const error = new Error('some error');
        error.loginAttempts = 3;

        authenticatWithJwt(error);

        sinon.assert.calledWith(req.flash, `You account is now locked, please contact us.`);
        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
        sinon.assert.notCalled(jwt.saveData);
      });

      it('sets flash error if user has limited login attempts remaining', () => {
        authentication.login(req, res);

        const error = new Error('some error');
        error.loginAttempts = 1;

        authenticatWithJwt(error);

        sinon.assert.calledWith(req.flash, `Incorrect username and/or password entered, 2 login attempts remaining`);
        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
        sinon.assert.notCalled(jwt.saveData);
      });
    });

    it('redirects to login page if error with req.login', () => {
      authentication.login(req, res);

      const error = new Error('some error');
      loginStub.callsArgWith(2, error);

      authenticatWithJwt(null, user);

      sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
      sinon.assert.notCalled(jwt.saveData);
    });
  });
});
