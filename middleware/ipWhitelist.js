const config = require('config');

const ipWhitelist = (req, res, next) => {
  if (req.ip === config.services.tableau.ipAddress) {
    res.locals = res.locals || {};
    res.locals.ipWhitelisted = true;
  }
  return next()
}

module.exports = ipWhitelist