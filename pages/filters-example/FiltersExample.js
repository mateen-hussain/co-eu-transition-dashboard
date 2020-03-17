const Page = require('core/pages/page');
const { paths } = require('config');
const { getFilters } = require('helpers/filters');

class FiltersExample extends Page {
  get url() {
    return paths.filterExample;
  }

  get schema() {
    return {
      filters: {
        date: ['01/01/2020', '01/01/2021']
      }
    };
  }

  async projects() {
    return await this.req.user.getProjects(this.data.filters);
  }

  async filters() {
    return await getFilters(this.data.filters, this.req.user);
  }
}

module.exports = FiltersExample;