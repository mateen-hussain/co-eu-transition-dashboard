const Page = require('core/pages/page');
const { paths } = require('config');
const moment = require('moment');
const ProjectField = require('models/projectField');
const FieldEntryGroup = require('models/fieldEntryGroup');
const authentication = require('services/authentication');

class ProjectDetails extends Page {
  get url() {
    return paths.projectDetails;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader', 'admin', 'viewer', 'management'])
    ];
  }

  async project() {
    return await this.req.user.getProject(this.req.params.uid);
  }

  async getFields() {
    return await ProjectField.findAll();
  }

  async getProjectGroups() {
    return await FieldEntryGroup.findAll();
  }

  get tableFields() {
    return ['uid', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  get currentDate() {
    return moment().format('YYYY-MM-DD');
  }

  get milestoneTableFields() {
    return ['uid', 'description', 'date', 'complete', 'comments'];
  }
}

module.exports = ProjectDetails;