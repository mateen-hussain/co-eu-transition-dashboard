const passport = require('passport');
const jwt = require('services/jwt');
const config = require('config');
const bcrypt = require('bcrypt');
const User = require('models/user');
const { Strategy: passportLocalStrategy } = require('passport-local');
const { Strategy: passportJWTStrategy } = require("passport-jwt");
const speakeasy = require('speakeasy');
const maximumLoginAttempts = 3;

const hashPassphrase = passphrase => {
  try {
    return bcrypt.hash(passphrase,config.bcrypt.saltRounds);
  } catch(err) {
    throw Error(`Bcrypt error: ${err}`);
  }
};

const authenticateLogin = async (email, password, done) => {
  const user = await User.findOne({
    where: { email }
  });

  if(!user) {
    const error = new Error('No user found');
    return done(error);
  }

  if(user.loginAttempts >= maximumLoginAttempts) {
    const error = new Error('Maximum login attempts exeeded');
    error.maximumLoginAttempts = true;
    return done(error);
  }

  const passwordMatches = await bcrypt.compare(password, user.hashedPassphrase);
  if (!passwordMatches) {
    await user.increment("loginAttempts")
    const error = new Error('Password doest not match');
    return done(error);
  }

  await user.update({ loginAttempts: 0 });
  done(null, user);
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

  const updateCookieExpiration = (req, res, next) => {
    jwt.saveData(req, res);
    next();
  };

  return [auth, check2fa, checkRole, updateCookieExpiration];
};

const protectNo2FA = passport.authenticate('jwt', {
  session: false,
  failureRedirect: config.paths.authentication.login
});

const login = (req, res, callback) => {
  return passport.authenticate('local', {
    session: false
  }, callback)(req, res);
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
  hashPassphrase
};
