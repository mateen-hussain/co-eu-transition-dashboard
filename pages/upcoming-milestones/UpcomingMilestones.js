const Page = require('core/pages/page');
const config = require('config');
const moment = require('moment');
const { getFilters } = require('helpers/filters');
const cloneDeep = require('lodash/cloneDeep');
const { removeNulls } = require('helpers/utils');

const showMilstonesDaysFromNow = 30;

class UpcomingMilestones extends Page {
  get url() {
    return config.paths.upcomingMilestones;
  }

  async getDepartmentsWithUpcomingMilestones() {
    const today = moment();
    const thirtyDaysFromNow = moment().add(showMilstonesDaysFromNow, 'days');

    const departments = await this.req.user.getDepartmentsWithProjects({
      date: {
        from: today.format('DD/MM/YYYY'),
        to: thirtyDaysFromNow.format('DD/MM/YYYY')
      },
      impact: [0, 1]
    });

    return this.groupDataByDate(departments, today, thirtyDaysFromNow);
  }

  projectsWithMilestonesForDate(projects, date) {
    const projectsWithMilestonesOnDate = projects.map(project => {
      // only milestones on this day
      project.milestones = project.milestones.filter(milestone => milestone.date === date.format('DD/MM/YYYY'));
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

  groupDataByDate(departments, from, to) {
    const dates = [];

    for (let date = moment(from); date.isBefore(to); date.add(1, 'days')) {
      const departmentsWithProjectsWithMilestonesForDate = this.departmentsWithProjectsWithMilestonesForDate(departments, date);

      // add up total milestones for department
      const totalMilestones = departmentsWithProjectsWithMilestonesForDate.reduce((total, department) => {
        total += department.totalMilestones;
        return total;
      }, 0);

      if(departmentsWithProjectsWithMilestonesForDate.length) {
        dates.push({
          date: date.format('DD/MM/YYYY'),
          departments: departmentsWithProjectsWithMilestonesForDate,
          totalMilestones
        });
      }
    }

    return dates;
  }

  getProjectsFromDepartments(departments) {
    return departments.reduce((projects, department) => {
      projects.push(...department.projects);
      return projects;
    }, []);
  }

  chartData(departments) {
    const projects = this.getProjectsFromDepartments(departments);

    let items = projects.reduce((items, project) => {
      project.milestones.forEach(milestone => {
        items.push({
          departmentName: project.departmentName,
          title: project.title,
          milestoneDescription: milestone.description,
          impact: project.impact,
          hmgConfidence: project.fields.get('hmgConfidence') ? project.fields.get('hmgConfidence').value : 'N/A',
          date: milestone.date
        });
      });

      return items;
    }, []);

    items = items
      .sort((a, b) => (moment(a.date, 'DD/MM/YYYY').isAfter(moment(b.date, 'DD/MM/YYYY'))) ? 1 : -1);

    return {
      min: moment().format('x'),
      max: moment().add(showMilstonesDaysFromNow, 'days').format('x'),
      data: items.map((item, index) => {
        return {
          x: moment(item.date, 'DD/MM/YYYY').format('x'),
          y: items.length - index - 1
        };
      }),
      meta: items
    };
  }

  get projectFields() {
    return [{ title:'Project UID', id: 'uid' }, { title:'Project Name', id: 'title' }, { title:'Impact', id: 'impact' }, { title:'HMG Confidence', id: 'hmgConfidence' }, { title:'Citizen Readiness', id: 'citizenReadiness' }, { title:'Business Readiness', id: 'businessReadiness' }, { title:'EU Member State Delivery Confidence', id: 'euStateConfidence' }];
  }

  get milestoneFields() {
    return [{ title:'Milestone UID', id: 'uid' }, { title:'Milestone Description', id: 'description' }, { title:'Due Date', id: 'date' }, { title:'Latest Comments', id: 'comment' }];
  }

  get filtersFields() {
    return ['departmentName', 'title', 'deliveryTheme', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence', 'progressStatus'];
  }

  async filters() {
    return await getFilters(this.data.filters, this.req.user);
  }

  applyFormatting(attribute, value) {
    const getConfidenceDescription = (type) => {
      switch(value) {
      case 3:
        return `High ${type}`;
      case 2:
        return `Medium ${type}`;
      case 1:
        return `Low ${type}`;
      case 0:
        return `Very low ${type}`;
      default:
        return `No ${type} level given`;
      }
    };

    const getImpactDescription = (type) => {
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
      return `${value} - ${getImpactDescription('impact')}`;
    case 'hmgConfidence':
    case 'citizenReadiness':
    case 'businessReadiness':
    case 'euStateConfidence':
      return `${value} - ${getConfidenceDescription('confidence')}`;
    }

    return value;
  }

  formatDate(date) {
    return moment(date, 'DD/MM/YYYY').format("Do MMMM YYYY");
  }

  async postRequest(req, res) {
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
      res.redirect(this.url);
    } else {
      super.postRequest(req, res);
    }
  }
}

module.exports = UpcomingMilestones;