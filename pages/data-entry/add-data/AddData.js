const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');

class AddData extends Page {
  get url() {
    return paths.dataEntry.addData;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin'])
    ];
  }
}

module.exports = AddData;
