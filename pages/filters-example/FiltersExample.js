const Page = require('../../core/pages/page');
const { paths } = require('config');
const database = require('../../services/database');

class FiltersExample extends Page {
  get url() {
    return paths.filterExample;
  }

  async projects() {
    return await database.getProjects(this.data.filters);
  }

  async getFilters() {
    return await database.getFilters(this.data.filters);
  }
}

module.exports = FiltersExample;