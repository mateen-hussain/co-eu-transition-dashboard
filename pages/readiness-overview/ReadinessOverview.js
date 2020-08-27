const Page = require('core/pages/page');
const { paths } = require('config');
const tableau = require('services/tableau');
const logger = require('services/logger');
const authentication = require('services/authentication');

const getTableauUrl = async (req, res, next) => {
  try {
    res.locals.tableauIframeUrl = await tableau.getTableauUrl(req.user, 'Readiness', 'Landing');
  } catch (error) {
    res.locals.tableauIframeError = error;
    logger.error(`Error from tableau: ${error}`);
  }
  next();
};

class ReadinessOverview extends Page {
  get url() {
    return paths.readinessOverview;
  }

  get middleware() {
    return [
      ...super.middleware,
      getTableauUrl,
      ...authentication.protect(['viewer'])
    ];
  }
}

module.exports = ReadinessOverview;
