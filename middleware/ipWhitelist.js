const config = require('config');
const ipRangeCheck = require("ip-range-check");

const ipWhitelist = (req, res, next) => {
  if (ipRangeCheck(req.ip, config.services.tableau.whiteListedIpRange)) {
    res.locals = res.locals || {};
    res.locals.ipWhitelisted = true;
  }
  return next()
}

module.exports = ipWhitelist