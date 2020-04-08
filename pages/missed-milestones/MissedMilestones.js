const Page = require('core/pages/page');
const config = require('config');
const moment = require('moment');
const Milestone = require('models/milestone');
const Project = require('models/project');

class MissedMilestones extends Page {
  static get isEnabled() {
    return config.features.missedMilestones;
  }

  get url() {
    return config.paths.missedMilestones;
  }

  async getDepartmentsWithMissedMilestones() {
    const departments = await this.req.user.getDepartmentsWithProjects({
      date: { to: moment().format('DD/MM/YYYY') },
      impact: [0, 1]
    });

    for(const department of departments) {
      department.totalMilestones = await this.totalMilestones(department);
      department.totalMilestonesMissed = department.projects.reduce((total, project) => {
        return total + project.milestones.length;
      }, 0);
    }

    return departments
      .sort((a, b) => (a.totalMilestonesMissed < b.totalMilestonesMissed) ? 1 : -1);
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

  get projectFields() {
    return [{ title:'Project UID', id: 'uid' }, { title:'Project Name', id: 'title' }, { title:'Impact', id: 'impact' }, { title:'HMG Confidence', id: 'hmgConfidence' }, { title:'Citizen Readiness', id: 'citizenReadiness' }, { title:'Business Readiness', id: 'businessReadiness' }, { title:'EU Member State Delivery Confidence', id: 'euStateConfidence' }];
  }

  get milestoneFields() {
    return [{ title:'Milestone UID', id: 'uid' }, { title:'Milestone Description', id: 'description' }, { title:'Due Date', id: 'date' }, { title:'Latest Comments', id: 'comment' }];
  }
}

module.exports = MissedMilestones;