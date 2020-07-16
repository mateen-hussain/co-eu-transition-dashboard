const Page = require('core/pages/page');
const { paths } = require('config');
const tableau = require('services/tableau');

class ViewReporting extends Page {
  get url() {
    return paths.viewReporting;
  }

  async getIframeUrl() {
    return await tableau.getTableauUrl(this.req.user, 'workbook', 'view');
  }
}

module.exports = ViewReporting;
