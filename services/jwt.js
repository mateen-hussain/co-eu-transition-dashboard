const jwt = require('jsonwebtoken');
const config = require('config');

const saveData = (req, res, data = {}, keepExisting = true) => {
  const cookieOptions = {
    maxAge: config.cookie.expires,
    httpOnly: true,
    secure: config.env !== 'development',
    domain: config.cookie.domain
  };

  const existingData = keepExisting ? restoreData(req, res) : {};
  const dataToSave = Object.assign({}, existingData, data);
  const token = jwt.sign(dataToSave, config.cookie.secret);
  res.cookie('jwt', token, cookieOptions);
  if (req && req.cookies['jwt']) {
    req.cookies['jwt'] = token;
  }
};

const token = req => {
  if (req && req.cookies) {
    return req.cookies['jwt'];
  }
  return null;
};

const restoreData = (req, res) => {
  if (req && req.cookies['jwt']) {
    try {
      return jwt.verify(req.cookies['jwt'], config.cookie.secret);
    } catch (error) {
      clearCookie(res)
      return {};
    }
  } else {
    return {};
  }
};

const clearCookie = res => {
  res.clearCookie("jwt", { domain: config.cookie.domain })
}

module.exports = {
  saveData,
  restoreData,
  token,
  clearCookie
};