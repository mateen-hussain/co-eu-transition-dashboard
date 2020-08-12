const Page = require('core/pages/page');
const { paths } = require('config');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');

class CSVExport extends Page {
  get url() {
    return paths.csvExport;
  }

  get middleware() {
    return [];
  }

  get mode() {
    return this.req.path === '/' ? 'html' : 'data';
  }

  async getRequest(req, res) {
    if(this.mode === 'data') {
      const data = [];

      for(var i = 0; i < 10; i ++) {
        data.push({
          name: `Item ${i+1}`,
          metric1: Math.floor(Math.random() * 10),
          metric2: Math.floor(Math.random() * 10)
        });
      }

      return res.json(data);
    }

    super.getRequest(req, res);
  }

  async postRequest(req, res) {
    res.sendStatus(METHOD_NOT_ALLOWED);
  }
}


module.exports = CSVExport;

