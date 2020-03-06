const Page = require('core/pages/page');
const { paths } = require('config');
const sequelize = require('sequelize');
const Projects = require('models/projects');
const Milestones = require('models/milestones');
const { filters } = require('helpers');
const moment = require('moment');

class AllData extends Page {
  get url() {
    return paths.allData;
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
      include: [{ model: Milestones }],
      raw: true,
      nest: true
    });
  }

  async filters() {
    return await filters(this.search);
  }

  get currentDate() {
    return moment().format()
  }
}

module.exports = AllData;