const Page = require('core/pages/page');
const { paths } = require('config');
const tableau = require('services/tableau');

class ReportingOverview extends Page {
  get url() {
    return paths.reportingOverview;
  }

  async getIframeUrl() {
    return await tableau.getTableauUrl(this.req.user, 'workbook', 'view');
  }
}

module.exports = ReportingOverview;
