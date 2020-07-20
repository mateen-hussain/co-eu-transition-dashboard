const Page = require('core/pages/page');
const { paths } = require('config');
const tableau = require('services/tableau');
const logger = require('services/logger');

const getTableauUrl = async (req, res, next) => {
  try {
    res.locals.tableauIframeUrl = await tableau.getTableauUrl(this.req.user, 'MilestonesWorkbook1', 'Gantt');
  } catch (error) {
    res.locals.tableauIframeError = error;
    logger.error(`Error from tableau: ${error}`);
  }
  next();
};

class ReportingOverview extends Page {
  get url() {
    return paths.reportingOverview;
  }

  get middleware() {
    return [
      ...super.middleware,
      getTableauUrl
    ];
  }
}

module.exports = ReportingOverview;
