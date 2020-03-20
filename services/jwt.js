const jwt = require('jsonwebtoken');
const config = require('config');

const saveData = (req, res, data = {}, keepExisting = true) => {
  const existingData = keepExisting ? restoreData(req) : {};
  const dataToSave = Object.assign({}, existingData, data);
  const token = jwt.sign(dataToSave, config.cookie.secret);
  res.cookie('jwt', token);
};

const token = req => {
  if (req && req.cookies) {
    return req.cookies['jwt'];
  }
  return null;
};

const restoreData = req => {
  if (req && req.cookies['jwt']) {
    try {
      return jwt.verify(req.cookies['jwt'], config.cookie.secret);
    } catch (error) {
      return {};
    }
  } else {
    return {};
  }
};

module.exports = {
  saveData,
  restoreData,
  token
};