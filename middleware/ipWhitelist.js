const config = require('config');
const ipRangeCheck = require("ip-range-check");

const tableauIpWhiteList = (req, res, next) => {
  if (ipRangeCheck(req.ip, config.services.tableau.whiteListedIpRange)) {
    res.locals = res.locals || {};
    res.locals.tableauIpWhiteList = true;
  }
  return next();
}

const ipWhiteList = (req, res, next) => {
  if (ipRangeCheck(req.ip, config.ipWhiteList)) {
    res.locals = res.locals || {};
    res.locals.ipWhiteList = true;
  }
  return next();
}

module.exports = {
  tableauIpWhiteList,
  ipWhiteList
}
