const { expect, sinon } = require('test/unit/util/chai');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const config = require('config');
const bcrypt = require('bcrypt');
const User = require('models/user');
const Department = require('models/department');
const Role = require('models/role');
const sequelize = require('services/sequelize');
const { Op } = require('sequelize');

let passportLocalStrategyStub = {};
let passportJWTStrategyStub = {};
let passportStub = {};
let authentication = {};

const user = {
  email: 'email',
  password: 'password',
  hashedPassphrase: 'password',
  role: 'viewer',
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

        it('updates users login attempts and last login', () => {
          sinon.assert.calledWith(user.update, { loginAttempts: 0, lastLoginAt: sequelize.fn('NOW')  });
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
        expect(error.maximumLoginAttempts).to.be.ok;
      });
    });

    describe('#authenticateUser', () => {
      const jwtPayload = { id: 1 };

      it('returns found user', async () => {
        User.findOne.resolves({ id: user.id, role: user.role });
        const authenticateUserCallback = sinon.stub();

        await authentication.authenticateUser(jwtPayload, authenticateUserCallback);

        sinon.assert.calledWith(User.findOne, {
          where: { id: jwtPayload.id, loginAttempts: { [Op.lte]: config.users.maximumLoginAttempts } },
          include: [{
            model: Department
          },{
            model: Role 
          }]
        });

        sinon.assert.calledWith(authenticateUserCallback, null, { id: user.id, role: user.role });
      });

      it('rejects on findone error', async () => {
        const error = new Error('some error...');
        User.findOne.rejects(error);
        const authenticateUserCallback = sinon.stub();

        await authentication.authenticateUser(jwtPayload, authenticateUserCallback);

        sinon.assert.calledWith(User.findOne, {
          where: { id: jwtPayload.id, loginAttempts: { [Op.lte]: config.users.maximumLoginAttempts } },
          include: [{
            model: Department
          },{
            model: Role 
          }]
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
        const middleware = authentication.protect(['viewer']);
        const req = { user: { roles: [{ name: 'viewer' }] } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[2](req, res, next);

        sinon.assert.called(next);
      });

      it('allows mulitple defined roles', () => {
        const middleware = authentication.protect(['uploader', 'admin', 'viewer']);
        const req = { user: { roles: [{ name: 'viewer' }] } };
        const next = sinon.stub();

        middleware[2](req, {}, next);

        sinon.assert.called(next);
      });

      it('redirects to login if no user assigned to req', () => {
        const middleware = authentication.protect(['viewer']);
        const req = { };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[2](req, res, next);

        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
      });

      it('redirects to login if user role does not match', () => {
        const middleware = authentication.protect(['uploader', 'administrator']);
        const req = { user: { roles: [{ name: 'viewer' }] } };
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

        const middleware = authentication.protect(['viewer']);
        const req = { user: { role: 'viewer' } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[1](req, res, next);

        sinon.assert.called(next);
      });

      it('redirects if no tfa ', () => {
        jwt.restoreData.returns({ tfa: false });

        const middleware = authentication.protect(['viewer']);
        const req = { user: { role: 'viewer' } };
        const res = { redirect: sinon.stub() };
        const next = sinon.stub();

        middleware[1](req, res, next);

        sinon.assert.calledWith(res.redirect, config.paths.authentication.login);
        sinon.assert.notCalled(next);
      });
    });

    it('update cookie expiration', () => {
      sinon.stub(jwt, 'saveData');

      const middleware = authentication.protect(['viewer']);
      const req = { user: { role: 'viewer' } };
      const res = { redirect: sinon.stub() };
      const next = sinon.stub();

      middleware[3](req, res, next);

      sinon.assert.calledWith(jwt.saveData, req, res);
      sinon.assert.called(next);

      jwt.saveData.restore();
    });
  });
});
