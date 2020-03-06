const { expect, sinon } = require('test/unit/util/chai');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const config = require('config');
const logger = require('services/logger');
const bcrypt = require('bcrypt');

let passportLocalStrategyStub = {};
let passportJWTStrategyStub = {};
let passportStub = {};
let authentication = {};

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
      it('passes if correct credentials are given', async () => {
        bcrypt.compare.callsArgWith(2, null, true);

        const email = 'test';
        const password = 'password';

        const callback = sinon.stub();

        await authentication.authenticateLogin(email, password, callback);

        sinon.assert.calledWith(callback, null, { id: undefined });
      });

      it('rejects if correct credentials are given', async () => {
        const error = new Error('some error');
        bcrypt.compare.callsArgWith(2, error);

        const email = 'test';
        const password = 'bad password';

        const callback = sinon.stub();

        await authentication.authenticateLogin(email, password, callback);

        sinon.assert.calledWith(callback, error);
      });
    });

    describe('#authenticateUser', () => {
      it('passes', async () => {
        const jwtPayload = { id: 2 };

        const callback = sinon.stub();

        await authentication.authenticateUser(jwtPayload, callback);

        sinon.assert.calledWith(callback, null, {});
      });
    });
  });

  describe('#protect', () => {
    it('is created correctly', () => {
      sinon.assert.calledWith(passportStub.authenticate, 'jwt', {
        session: false,
        failureRedirect: config.paths.authentication
      });
    });

    it('passes', () => {
      expect(authentication.protect).to.eql(passportStub.authenticate());
    });
  });

  describe('#login', () => {
    let req = {
      login: sinon.stub().callsArgWith(2, null)
    };
    let res = {
      redirect: sinon.stub()
    };
    let user = {};
    let authenticatWithJwt = {};
    let loginStub = {};


    beforeEach(() => {
      loginStub = sinon.stub().callsArgWith(2, null);
      req = { login: loginStub };
      res = { redirect: sinon.stub() };
      user = { name: 'some name'};

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

    it('redirects to all-data page', () => {
      authentication.login(req, res);

      authenticatWithJwt(null, user);

      sinon.assert.calledWith(jwt.saveData, req, res, user);
      sinon.assert.calledWith(res.redirect, config.paths.allData);
    });

    it('redirects to login page if error with authenticatWithJwt', () => {
      authentication.login(req, res);

      const error = new Error('some error');

      authenticatWithJwt(error);

      sinon.assert.calledWith(res.redirect, config.paths.authentication);
      sinon.assert.notCalled(jwt.saveData);
    });

    it('redirects to login page if error with req.login', () => {
      authentication.login(req, res);

      const error = new Error('some error');
      loginStub.callsArgWith(2, error);

      authenticatWithJwt(null, user);

      sinon.assert.calledWith(res.redirect, config.paths.authentication);
      sinon.assert.notCalled(jwt.saveData);
    });
  });
});