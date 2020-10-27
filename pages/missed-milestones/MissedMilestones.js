const Page = require('core/pages/page');
const config = require('config');
const moment = require('moment');
const Milestone = require('models/milestone');
const Project = require('models/project');
const authentication = require('services/authentication');
const { getFilters } = require('helpers/filters');
const { removeNulls } = require('helpers/utils');
const cloneDeep = require('lodash/cloneDeep');

class MissedMilestones extends Page {
  get url() {
    return config.paths.missedMilestones;
  }

  get schema() {
    return {
      filters: {}
    };
  }

  get middleware() {
    return [
      ...authentication.protect(['management'])
    ];
  }

  async getChartData() {
    const departments = await this.req.user.getDepartmentsWithProjects({
      date: { to: moment().subtract(1, 'days').format('DD/MM/YYYY') },
      complete: ['No'],
      impact: [0, 1]
    });

    for(const department of departments) {
      department.totalMilestones = await this.totalMilestones(department);
      department.totalMilestonesMissed = department.projects.reduce((total, project) => {
        return total + project.milestones.length;
      }, 0);
    }

    return {
      departments: departments.sort((a, b) => (a.totalMilestonesMissed < b.totalMilestonesMissed) ? 1 : -1)
    }
  }

  async totalMilestones(department) {
    const count = await Milestone.count({
      include: [{
        attributes: [],
        model: Project,
        where: { departmentName: department.name },
        required: true
      }]
    });

    return count;
  }

  chartData(departments) {
    const data = {
      labels: departments.map(department => department.name),
      data: departments.map(department => department.totalMilestonesMissed),
      meta: departments.map(department => {
        return {
          totalMilestonesMissed: department.totalMilestonesMissed,
          totalMilestones: department.totalMilestones
        };
      }),
    };

    return data;
  }

  async getDepartmentsWithMissedMilestones() {
    const filters = this.data.filters || {};
    filters.complete = ['No'];
    filters.impact = [0, 1];
    filters.date = { to: moment().subtract(1, 'days').format('DD/MM/YYYY') };
    const departments = await this.req.user.getDepartmentsWithProjects(filters);

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

  milestoneDates(departments) {
    const dates = departments.reduce((dates, department) => {
      department.projects.forEach(project => {
        project.milestones.forEach(milestone => {
          if(milestone.date && !dates.includes(milestone.date)){
            dates.push(milestone.date);
          }
        });
      });
      return dates;
    }, []);

    return dates.sort((a, b) => moment(a, 'DD/MM/YYYY').valueOf() - moment(b, 'DD/MM/YYYY').valueOf());
  }

  groupDataByDate(departments) {
    const milestoneDates = this.milestoneDates(departments);

    return milestoneDates.map(date => {
      const departmentsWithProjectsWithMilestonesForDate = this.departmentsWithProjectsWithMilestonesForDate(departments, date);

      // add up total milestones for department
      const totalMilestones = departmentsWithProjectsWithMilestonesForDate.reduce((total, department) => {
        total += department.totalMilestones;
        return total;
      }, 0);

      return {
        date: moment(date, 'DD/MM/YYYY').format('DD/MM/YYYY'),
        departments: departmentsWithProjectsWithMilestonesForDate,
        totalMilestones
      };
    });
  }

  get filtersFields() {
    return ['deliveryTheme'];
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

module.exports = MissedMilestones;