const Page = require('core/pages/page');
const config = require('config');
const moment = require('moment');
const { getFilters } = require('helpers/filters');
const cloneDeep = require('lodash/cloneDeep');
const { removeNulls } = require('helpers/utils');

class UpcomingMilestones extends Page {
  get url() {
    return config.paths.upcomingMilestones;
  }

  get schema() {
    return {
      filters: {
        date: {
          from: moment().format('DD/MM/YYYY'),
          to: moment().add('6', 'weeks').format('DD/MM/YYYY')
        }
      }
    };
  }

  async getDepartmentsWithUpcomingMilestones() {
    const filters = this.data.filters || {};
    filters.complete = ['No'];
    const departments = await this.req.user.getDepartmentsWithProjects(this.data.filters);

    return this.groupDataByDate(departments);
  }

  projectsWithMilestonesForDate(projects, date) {
    const projectsWithMilestonesOnDate = projects.map(project => {
      // only milestones on this day
      project.milestones = project.milestones.filter(milestone => milestone.date === date);
      return project;
    });

    // only projects that have milestones on this day
    return projectsWithMilestonesOnDate.filter(project => project.milestones.length);
  }

  departmentsWithProjectsWithMilestonesForDate(departments, date) {
    const departmentsCloned = cloneDeep(departments);

    let departmentsByDate = departmentsCloned.map(department => {
      department.projects = this.projectsWithMilestonesForDate(department.projects, date);

      // add up total milestones for department
      department.totalMilestones = department.projects.reduce((total, project) => {
        total += project.milestones.length;
        return total;
      }, 0);

      return department;
    });

    // only departments that have milestones on this day
    return departmentsByDate.filter(department => department.projects.length);
  }

  groupDataByDate(departments) {
    let dates = {};

    departments.forEach( department => {
      department.projects.forEach( project => {
        project.milestones.forEach( milestone => {
          const dateString = moment(milestone.date,'DD/MM/YYYY').format('DD/MM/YYYY');
          if (dates[dateString]) {
            if (dates[dateString][department.name]) {
              if (dates[dateString][department.name]["projects"][project.uid]) {
                dates[dateString][department.name]["projects"][project.uid].milestones.push(milestone);
              } else {
                dates[dateString][department.name]["projects"][project.uid] = {
                  project: project,
                  milestones: [milestone]
                };
              }
            } else {
              dates[dateString][department.name] = {
                department: department,
                projects: {
                  [project.uid]: {
                    project: project,
                    milestones: [milestone]
                  }
                }
              };
            }
          } else {
            dates[dateString] = {};
            dates[dateString][department.name] = {
              department: department,
              projects: {
                [project.uid]: {
                  project: project,
                  milestones: [milestone]
                }
              }
            };
          }
        });
      });
    });

    let result = [];

    Object.keys(dates).forEach( date => {
      let departments = [];
      let count = 0;
      Object.keys(dates[date]).forEach( departmentName => {
        let department = cloneDeep(dates[date][departmentName].department);
        department.projects = [];
        department.dataValues.projects = [];
        Object.keys(dates[date][departmentName].projects).forEach( projectUid => {
          let project = cloneDeep(dates[date][departmentName].projects[projectUid].project);
          project.milestones = dates[date][departmentName].projects[projectUid].milestones;
          project.dataValues.milestones = dates[date][departmentName].projects[projectUid].milestones;

          count += project.dataValues.milestones.length;

          department.projects.push(project);
          department.dataValues.projects.push(project);
        });
        departments.push(department);
      });
      result.push({
        date: date,
        departments: departments,
        totalMilestones: count
      });
    });

    result.sort((a, b) => moment(a, 'DD/MM/YYYY').valueOf() - moment(b, 'DD/MM/YYYY').valueOf());

    return result;
  }

  get filtersFields() {
    return ['deliveryConfidence', 'category', 'departmentName', 'deliveryTheme', 'impact', 'hmgConfidence'];
  }

  async filters() {
    return await getFilters(this.data.filters, this.req.user);
  }

  applyFormatting(attribute, value = "") {
    const getConfidenceDescription = (type) => {
      switch(String(value)) {
      case "3":
        return `High ${type}`;
      case "2":
        return `Medium ${type}`;
      case "1":
        return `Low ${type}`;
      case "0":
        return `Very low ${type}`;
      default:
        return `No ${type} level given`;
      }
    };

    const getImpactDescription = (type = "") => {
      switch(String(value)) {
      case "0":
        return `Very high ${type}`;
      case "1":
        return `High ${type}`;
      case "2":
        return `Medium ${type}`;
      case "3":
        return `Low ${type}`;
      default:
        return `No ${type} level given`;
      }
    };

    switch(attribute.id) {
    case 'impact':
      return `${value} - ${getImpactDescription('impact')}`;
    case 'hmgConfidence':
    case 'deliveryConfidence':
      return `${value} - ${getConfidenceDescription('confidence')}`;
    }

    return value;
  }

  formatDate(date) {
    return moment(date, 'DD/MM/YYYY').format("Do MMMM YYYY");
  }

  async postRequest(req, res) {
    if(req.body.clear) {
      this.clearData();
      return res.redirect(this.url);
    }

    if(req.body.filterId) {
      let filters = this.data.filters;
      const filterId = req.body.filterId;
      const optionValue = req.body.optionValue;

      if (!optionValue) {
        delete filters[filterId];
      } else {
        for (var i = filters[filterId].length - 1; i >= 0; i--) {
          if (filters[filterId][i] == optionValue) filters[filterId].splice(i, 1);
        }
      }

      this.saveData(removeNulls({ filters }));
      return res.redirect(this.url);
    }

    super.postRequest(req, res);
  }
}

module.exports = UpcomingMilestones;
