const passport = require('passport');
const jwt = require('services/jwt');
const config = require('config');
const logger = require('services/logger');
const bcrypt = require('bcrypt');
const User = require('models/users');
const { Strategy: passportLocalStrategy } = require('passport-local');
const { Strategy: passportJWTStrategy } = require("passport-jwt");

const authenticateLogin = (email, password, cb) => {
  return User.findOne({
    attributes: ['id', 'email', 'password', 'role'],
    where: {
      email: email
    },
    raw: true,
    nest: true
  })
  .then(user => {
    bcrypt.compare(password, user.password, (error, passwordMatches) => {
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
    attributes: ['id', 'role'],
    where: {
      id: jwtPayload.id
    },
    raw: true,
    nest: true
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
    failureRedirect: config.paths.authentication
  });

  const checkRole = (req, res, next) => {
    if(!req.user) {
      return res.redirect(config.paths.authentication);
    }

    if (!roles.includes(req.user.role)) {
      return res.redirect(config.paths.authentication);
    }

    return next();
  };

  return [auth, checkRole];
};

const login = (req, res) => {
  const authenticatWithJwt = (err, user) => {
    if(err || !user) {
      logger.error('Bad authentication');
      return res.redirect(config.paths.authentication);
    }

    req.login(user, {
      session: false
    }, err => {
      if (err) {
        logger.error(err);
        return res.redirect(config.paths.authentication);
      }

      jwt.saveData(req, res, { id: user.id });

      if (req.user.role === 'admin') {
        res.redirect(config.paths.admin.import);
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

module.exports = {
  login,
  protect,
  authenticateLogin,
  authenticateUser
}