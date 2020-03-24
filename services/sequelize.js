const { services } = require('config');
const Sequelize = require('sequelize');

// Something in cloudfoundry is replacing mysql:// with mysql2:// which is causing some issues
const sequelize = new Sequelize(services.mysql.uri.replace(/^mysql2:\/\//,'mysql://'),{
    dialect: 'mysql',
    dialectOptions: {
      ssl: services.mysql.sslCertificate
    },
    logging: false
});

module.exports = sequelize;
