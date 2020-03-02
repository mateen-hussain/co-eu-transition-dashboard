const winston = require('winston');
const expressWinston = require('express-winston');

const format = winston.format.printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const config = {
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.json(),
    format
  )
};

const routeLogger = expressWinston.logger(config);
const attachRouteLogger = app => app.use(routeLogger);

const errorLogger = expressWinston.errorLogger(config);
const attachErrorLogger = app => app.use(errorLogger);

module.exports = {
  attachRouteLogger,
  attachErrorLogger
};

