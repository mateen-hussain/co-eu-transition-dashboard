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
    return ['uid', 'departmentName', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  getField(fields = [], id) {
    return fields.find(field => field.id === id);
  }

  get currentDate() {
    return moment().format();
  }

  get milestoneTableFields() {
    return ['uid', 'description', 'date', 'comments'];
  }
}

module.exports = ProjectDetails;