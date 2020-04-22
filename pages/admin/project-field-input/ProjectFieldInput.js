const Page = require('core/pages/page');
const { paths } = require('config');

class ProjectFieldInput extends Page {
  get url() {
    return paths.admin.projectFieldInput;
  }
}

module.exports = ProjectFieldInput;