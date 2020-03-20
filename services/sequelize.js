const { services } = require('config');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(services.mysql.uri, {
  logging: false
});

module.exports = sequelize;
