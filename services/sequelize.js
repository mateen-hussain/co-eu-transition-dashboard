const { services } = require('config');
const Sequelize = require('sequelize');
const logger = require('services/logger');
const Umzug = require('umzug');
const path = require('path');

// Something in cloudfoundry is replacing mysql:// with mysql2:// which is causing some issues
const sequelize = new Sequelize(services.mysql.uri.replace(/^mysql2:\/\//,'mysql://'),{
  dialect: 'mysql',
  dialectOptions: {
    ssl: services.mysql.sslCertificate
  },
  logging: false
});

const umzug = new Umzug({
  migrations: {
    path: path.join(__dirname, '../migrations'),
    params: [ sequelize.getQueryInterface() ]
  },
  storage: 'sequelize',
  storageOptions: { sequelize }
});

sequelize.runMigrations = async () => {
  return await umzug.up();
};

sequelize.testConnection = async () => {
  try{
    await sequelize.authenticate();
  } catch(error) {
    logger.error(error);
    throw error;
  }
};

module.exports = sequelize;
