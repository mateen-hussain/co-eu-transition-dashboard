const Page = require('core/pages/page');
const { paths } = require('config');

class AddData extends Page {
  get url() {
    return paths.dataEntry.addData;
  }
}

module.exports = AddData;
