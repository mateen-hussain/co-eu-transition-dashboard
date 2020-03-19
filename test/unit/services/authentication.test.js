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
  hashed_passphrase: 'password',
  role: 'user',
  id: 1
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

    authentication = proxyquire('services/authentication', {
      'passport-local': { Strategy: passportLocalStrategyStub },
      'passport-jwt': { Strategy: passportJWTStrategyStub },
      'passport': passportStub
    });
  });

  afterEach(() => {
    bcrypt.compare.restore();
  });

  describe('strategyies', () => {
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
          User.findOne.resolves(user);
          bcrypt.compare.callsArgWith(2, null, true);

          authenticateLoginCallback = sinon.stub();

          await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);
        });

        it('correctly searches database', () => {
          sinon.assert.calledWith(User.findOne, {
            attributes: ['id', 'email', 'hashed_passphrase', 'role', 'twofa_secret'],
            where: { email: user.email },
            raw: true,
            nest: true
          });
        });

        it('checks password', () => {
          sinon.assert.calledWith(bcrypt.compare, user.password, user.password);
        });

        it('returns user id', () => {
          sinon.assert.calledWith(authenticateLoginCallback, null, user);
        });
      });

      describe('incorrect credentials', () => {
        beforeEach(async () => {
          User.findOne.resolves(user);
          bcrypt.compare.callsArgWith(2, null, false);

          authenticateLoginCallback = sinon.stub();

          await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);
        });

        it('correctly searches database', () => {
          sinon.assert.calledWith(User.findOne, {
            attributes: ['id', 'email', 'hashed_passphrase', 'role', 'twofa_secret'],
            where: { email: user.email },
            raw: true,
            nest: true
          });
        });

        it('checks password', () => {
          sinon.assert.calledWith(bcrypt.compare, user.password, user.password);
        });

        it('returns user id', () => {
          sinon.assert.calledWith(authenticateLoginCallback, null, false);
        });
      });

      it('error with bcrypt', async () => {
        const error = new Error('some error');
        bcrypt.compare.callsArgWith(2, error);
        User.findOne.resolves(user);
        authenticateLoginCallback = sinon.stub();

        await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);

        sinon.assert.calledWith(authenticateLoginCallback, error);
      });

      it('error finding user', async () => {
        const error = new Error('some error');
        User.findOne.rejects(error);
        authenticateLoginCallback = sinon.stub();

        await authentication.authenticateLogin(user.email, user.password, authenticateLoginCallback);

        sinon.assert.calledWith(authenticateLoginCallback, error);
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

    it('redirects to login page if error with authenticatWithJwt', () => {
      authentication.login(req, res);

      const error = new Error('some error');

      authenticatWithJwt(error);

      sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
      sinon.assert.notCalled(jwt.saveData);
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