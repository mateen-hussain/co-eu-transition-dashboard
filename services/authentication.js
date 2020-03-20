const passport = require('passport');
const jwt = require('services/jwt');
const config = require('config');
const logger = require('services/logger');
const bcrypt = require('bcrypt');
const User = require('models/user');
const { Strategy: passportLocalStrategy } = require('passport-local');
const { Strategy: passportJWTStrategy } = require("passport-jwt");
const speakeasy = require('speakeasy');

const authenticateLogin = (email, password, cb) => {
  return User.findOne({
    attributes: ['id', 'email', 'hashed_passphrase', 'role', 'twofa_secret'],
    where: {
      email: email
    },
    raw: true,
    nest: true
  })
  .then(user => {
    bcrypt.compare(password, user.hashed_passphrase, (error, passwordMatches) => {
      if (error || passwordMatches === false) {
        return cb(error, passwordMatches);
      }
      cb(null, user);
    });
  })
  .catch(cb);
};

const localStrategy = new passportLocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, authenticateLogin);
passport.use(localStrategy);

const authenticateUser = (jwtPayload, cb) => {
  return User.findOne({
    where: {
      id: jwtPayload.id
    }
  })
  .then(user => {
    cb(null, user);
  })
  .catch(cb);
};
const jwtStrategy = new passportJWTStrategy({
  jwtFromRequest: jwt.token,
  secretOrKey: config.cookie.secret
}, authenticateUser);
passport.use(jwtStrategy);

const protect = (roles = []) => {
  const auth = passport.authenticate('jwt', {
    session: false,
    failureRedirect: config.paths.authentication.login
  });

  const check2fa = (req, res, next) => {
    const data = jwt.restoreData(req) || {};
    if(!data.tfa && config.features.twoFactorAuth) {
      return res.redirect(config.paths.authentication.login);
    }
    return next();
  };

  const checkRole = (req, res, next) => {
    if(!req.user) {
      return res.redirect(config.paths.authentication.login);
    }

    if (!roles.includes(req.user.role)) {
      return res.redirect(config.paths.authentication.login);
    }

    return next();
  };

  return [auth, check2fa, checkRole];
};

const protectNo2FA = passport.authenticate('jwt', {
  session: false,
  failureRedirect: config.paths.authentication.login
});

const login = (req, res) => {
  const authenticatWithJwt = (err, user) => {
    if(err || !user) {
      logger.error(`Bad authentication: ${err}`);
      req.flash(`Incorrect username and/or password entered`);
      return res.redirect(config.paths.authentication.login);
    }

    req.login(user, {
      session: false
    }, err => {
      if (err) {
        logger.error(err);
        return res.redirect(config.paths.authentication.login);
      }

      jwt.saveData(req, res, { id: user.id, tfa: false });

      if(config.features.twoFactorAuth) {
        if (user.twofa_secret) {
          res.redirect(config.paths.authentication.verify);
        } else {
          res.redirect(config.paths.authentication.setup);
        }
      } else {
        res.redirect(config.paths.allData);
      }
    });
  };

  const authenticatWithCredentials = passport.authenticate('local', {
    session: false
  }, authenticatWithJwt);

  authenticatWithCredentials(req, res);
};

const verify2FA = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token
  });
};

module.exports = {
  login,
  protect,
  authenticateLogin,
  authenticateUser,
  protectNo2FA,
  verify2FA,
}
