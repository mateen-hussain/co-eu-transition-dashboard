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

  applyFormatting(attribute, value) {
    const getDescription = (type) => {
      switch(value) {
        case 0:
          return `Very high ${type}`;
        case 1:
          return `High ${type}`;
        case 2:
          return `Medium ${type}`;
        case 3:
          return `Low ${type}`;
        default:
          return `No ${type} level given`;
      }
    };

    switch(attribute.id) {
      case 'impact':
        return `${value} - ${getDescription('confidence')}`;
      case 'hmgConfidence':
      case 'citizenReadiness':
      case 'businessReadiness':
      case 'euStateConfidence':
        return `${value} - ${getDescription('confidence')}`;
    }

    return value;
  }

  formatDate(date) {
    return moment(date, 'DD/MM/YYYY').format("Do MMMM YYYY");
  }

  get filtersFields() {
    return ['deliveryTheme', 'uid', 'departmentName', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence', 'progressStatus'];
  }

  get tableFields() {
    if(this.res.locals.departmentalView){
      return ['uid', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
    }
    return ['uid', 'departmentName', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];
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