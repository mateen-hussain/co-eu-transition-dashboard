const { services } = require('config');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(services.mysql.database, services.mysql.user, services.mysql.password, {
  host: services.mysql.host,
  dialect: 'mysql',
  logging: false
});

module.exports = sequelize;