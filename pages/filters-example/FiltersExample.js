const Page = require('core/pages/page');
const { paths } = require('config');
const projects = require('models/projects');

class FiltersExample extends Page {
  get url() {
    return paths.filterExample;
  }

  async projects() {
    return await projects.getProjects(this.data.filters);
  }

  async getFilters() {
    return await projects.getFilters(this.data.filters);
  }
}

module.exports = FiltersExample;