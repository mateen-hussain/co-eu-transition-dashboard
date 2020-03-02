const logger = require('middleware/logger');
const { expect, sinon } = require('test/unit/util/chai');
const winston = require('winston');
const expressWinston = require('express-winston');

const defaultConfig = {transports: [ new winston.transports.Console() ]};

describe('middleware/logger', () => {
  describe('#attachRouteLogger', () => {
    it('attaches logger to router', () => {
      const app = {
        use: sinon.stub()
      };
      logger.attachRouteLogger(app);

      expect(app.use.firstCall.args.toString()).to.eql(expressWinston.logger(defaultConfig).toString());
    });
  });

  describe('#attachErrorLogger', () => {
    it('attaches error logger to router', () => {
      const app = {
        use: sinon.stub()
      };
      logger.attachErrorLogger(app);

      expect(app.use.firstCall.args.toString()).to.eql(expressWinston.errorLogger(defaultConfig).toString());
    });
  });
});
