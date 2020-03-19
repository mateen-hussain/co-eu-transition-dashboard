const Page = require('core/pages/page');
const { paths } = require('config');

class ProjectDetails extends Page {
  get url() {
    return paths.projectDetails;
  }

  async project() {
    return await this.req.user.getProject('Project 1');
  }
}

module.exports = ProjectDetails;