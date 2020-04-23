const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');

class ProjectFieldSubmitted extends Page {
  get url() {
    return paths.admin.projectFieldSubmitted;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin'])
    ];
  }
}

module.exports = ProjectFieldSubmitted;