const Page = require('../../core/pages/page');
const { paths } = require('config');
const database = require('../../services/database');

class AllData extends Page {
  get url() {
    return paths.allData;
  }

  async projects() {
    return await database.getProjects(this.data.filters);
  }

  async getFilters() {
    return await database.getFilters();
  }
}

module.exports = AllData;