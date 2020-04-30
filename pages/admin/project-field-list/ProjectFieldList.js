const Page = require('core/pages/page');
const { paths } = require('config');
const ProjectField = require('models/projectField');
const FieldEntryGroup = require('models/fieldEntryGroup');

class ProjectFieldList extends Page {
  get url() {
    return paths.admin.projectFieldList;
  }

  async getFields() {
    return await ProjectField.findAll();
  }

  async getProjectGroups() {
    return await FieldEntryGroup.findAll();
  }
}

module.exports = ProjectFieldList;