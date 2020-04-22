const Page = require('core/pages/page');
const { paths } = require('config');
const ProjectField = require('models/projectField');

class ProjectFieldList extends Page {
  get url() {
    return paths.admin.projectFieldList;
  }

  async getFields() {
    return await ProjectField.findAll();
  }
}

module.exports = ProjectFieldList;