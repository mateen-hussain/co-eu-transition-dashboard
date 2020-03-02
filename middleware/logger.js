const winston = require('winston');
const expressWinston = require('express-winston');

const format = winston.format.printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
  // if (info && info instanceof Error) {
  //   return `${info.timestamp} ${info.level}: ${info.message}\n\nStack Trace:\n\n${info.stack}`;
  // }
  // return `${info.timestamp} ${info.level}: ${info.message}`;
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
  ),
  meta: false,
  // msg: "HTTP {{req.method}} {{req.url}}",
  // expressFormat: true,
  // colorize: false,
  // ignoreRoute: () => { return false; }
}

const routeLogger = expressWinston.logger(config);
const errorLogger = expressWinston.errorLogger(config);

const attachRouteLogger = app => {
  app.use(routeLogger);
};

const attachErrorLogger = app => {
  app.use(errorLogger);
};

module.exports = {
  attachRouteLogger,
  attachErrorLogger
};

