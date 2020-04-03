const Page = require('core/pages/page');
const config = require('config');
const moment = require('moment');

const showMilstonesDaysFromNow = 30;

class UpcomingMilestones extends Page {
  get url() {
    return config.paths.upcomingMilestones;
  }

  async getDepartmentsWithUpcomingMilestones() {
    const thirtyDaysFromNow = moment().add(showMilstonesDaysFromNow, 'days');

    const departments = await this.req.user.getDepartmentsWithProjects({
      date: {
        from: moment().format('DD/MM/YYYY'),
        to: thirtyDaysFromNow.format('DD/MM/YYYY')
      },
      impact: [0, 1]
    });

    for(const department of departments) {
      department.totalUpcomingMilestones = department.projects.reduce((total, project) => {
        return total + project.milestones.length;
      }, 0);
    }

    return departments
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
}

module.exports = UpcomingMilestones;