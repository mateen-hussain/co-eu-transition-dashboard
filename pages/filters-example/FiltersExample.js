const Page = require('core/pages/page');
const { paths } = require('config');
const sequelize = require('sequelize');
const Projects = require('models/projects');
const Milestone = require('models/milestones');
const { filters } = require('helpers');

class FiltersExample extends Page {
  get url() {
    return paths.filterExample;
  }

  get search() {
    return Object.entries(this.data.filters || {}).reduce((filters, [attirbute, options]) => {
      filters[attirbute] = { [sequelize.Op.or]: options };
      return filters;
    }, {});
  }

  async projects() {
    return await Projects.findAll({
      where: this.search,
      include: [{ model: Milestone }],
      raw: true,
      nest: true
    });
  }

  async filters() {
    return await filters(this.search);
  }
}

module.exports = FiltersExample;