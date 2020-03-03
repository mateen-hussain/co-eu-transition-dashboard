const Page = require('../../core/pages/page');
const { paths } = require('config');
const projects = require('models/projects');

class AllData extends Page {
  get url() {
    return paths.allData;
  }

  async projects() {
    return await projects.getProjects(this.data.filters);
  }

  async getFilters() {
    return await projects.getFilters();
  }
}

module.exports = AllData;