const config = require('config');
const app = require('./app');
const logger = require('services/logger');

app.listen(config.port, function(){
  logger.info(`App available at http://localhost:${config.port}`);
});
