const Page = require('core/pages/page');
const { paths } = require('config');
const { getFilters } = require('helpers/filters');
const moment = require('moment');

class AllData extends Page {
  get url() {
    return paths.allData;
  }

  get schema() {
    return {
      filters: {
        date: ['01/01/2020', '01/01/2021']
      }
    };
  }

  get filtersFields() {
    return ['uid', 'department_name', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  get tableFields() {
    return ['uid', 'department_name', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  getField(fields = [], id) {
    return fields.find(field => field.id === id);
  }

  async projects() {
    return await this.req.user.getProjects(this.data.filters);
  }

  async filters() {
    return await getFilters(this.data.filters, this.req.user);
  }

  get currentDate() {
    return moment().format();
  }

  getFilter(id, filters) {
    return filters.find(filter => filter.id === id);
  }
}

module.exports = AllData;