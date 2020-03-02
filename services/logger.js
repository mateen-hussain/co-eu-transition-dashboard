const winston = require('winston');

const format = winston.format.printf(info => {
  if (info && info instanceof Error) {
    return `${info.timestamp} ${info.level}: ${info.message}\n\nStack Trace:\n\n${info.stack}`;
  }
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const config = {
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    format
  )
};

const logger = winston.createLogger(config);

module.exports = logger;

