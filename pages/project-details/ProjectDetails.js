const Page = require('core/pages/page');
const { paths } = require('config');

class ProjectDetails extends Page {
  get url() {
    return paths.projectDetails;
  }
}

module.exports = ProjectDetails;