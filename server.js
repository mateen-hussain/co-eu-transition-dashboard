const config = require('config');
const app = require('./app');
const logger = require('services/logger');
const sequelize = require('services/sequelize');

(async () => {
  await sequelize.testConnection();
  await sequelize.runMigrations();

  app.listen(config.port, function(){
    logger.info(`App available at http://localhost:${config.port}`);
  });
})();