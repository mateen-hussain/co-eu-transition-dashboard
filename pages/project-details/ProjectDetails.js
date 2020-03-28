const Page = require('core/pages/page');
const { paths } = require('config');
const moment = require('moment');

class ProjectDetails extends Page {
  get url() {
    return paths.projectDetails;
  }

  async project() {
    return await this.req.user.getProject(this.req.params.uid);
  }

  get tableFields() {
    return ['uid', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  get currentDate() {
    return moment().format('YYYY-MM-DD');
  }

  get milestoneTableFields() {
    return ['uid', 'description', 'date', 'comments'];
  }
}

module.exports = ProjectDetails;