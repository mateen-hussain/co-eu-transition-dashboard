const Page = require('core/pages/page');
const { paths } = require('config');
const { getFilters } = require('helpers/filters');
const moment = require('moment');

class AllData extends Page {
  get url() {
    return paths.allData;
  }

  get schema() {
    return { filters: {} };
  }

  get filtersFields() {
    return ['deliveryTheme', 'uid', 'departmentName', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  get tableFields() {
    if(this.res.locals.departmentalView){
      return ['uid', 'deliveryTheme', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
    }
    return ['uid', 'deliveryTheme', 'departmentName', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
  }

  get milestoneTableFields() {
    return ['uid', 'description', 'date', 'comments'];
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
}

module.exports = AllData;