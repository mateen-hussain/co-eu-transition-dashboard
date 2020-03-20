const { services } = require('config');
const Sequelize = require('sequelize');
const logger = require('services/logger');

function createCloudSequelize() {
  let jsonConfig = JSON.parse(process.env.VCAP_SERVICES);
  let mysqlConfig = jsonConfig.mysql[0].credentials;

  return new Sequelize(mysqlConfig.name, mysqlConfig.username, mysqlConfig.password, {
    host: mysqlConfig.host,
    dialect: 'mysql',
    dialectOptions: {
      ssl: "Amazon RDS"
    },
    logging: false,
  });
}

function createLocalSequelize() {
  return new Sequelize(services.mysql.uri, {
    dialect: 'mysql',
    logging: false
  });
}

const sequelize = process.env.VCAP_SERVICES ? createCloudSequelize() : createLocalSequelize();
module.exports = sequelize;
