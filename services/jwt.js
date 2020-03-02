const jwt = require('jsonwebtoken');
const config = require('config');

const saveData = (res, data) => {
  const token = jwt.sign(JSON.stringify(data), config.cookie.secret);
  res.cookie('jwt', token);
};

const restoreData = req => {
  return jwt.verify(req.cookies['jwt'], config.cookie.secret);
};

module.exports = {
  saveData,
  restoreData
};