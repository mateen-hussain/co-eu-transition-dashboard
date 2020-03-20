const authentication = require('services/authentication');

const protectIfNotLoginPage = (req, res, next) => {
  if (res.locals.mode !== 'login') {
    return authentication.protectNo2FA(req, res, next);
  }
  next();
};

module.exports = {
  protectIfNotLoginPage
}