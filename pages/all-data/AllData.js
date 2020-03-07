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

  get schema() {
    return {
      filters: {
        projects: [],
        milestones: []
      }
    };
  }

  get search() {
    const getFilters = type => {
      return Object.entries(this.data.filters[type] || {}).reduce((filters, [attirbute, options]) => {
        if (attirbute.includes('date')) {
          const dates = options.map(date => moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD'));
          filters[attirbute] = { [sequelize.Op.between]: dates };
        } else {
          filters[attirbute] = { [sequelize.Op.or]: options };
        }
        return filters;
      }, {});
    }

    return {
      projects: getFilters('projects'),
      milestones: getFilters('milestones')
    };
  }

  async projects() {
    return await Projects.findAll({
      where: this.search.projects,
      include: [{
        model: Milestones,
        where: this.search.milestones
      }]
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