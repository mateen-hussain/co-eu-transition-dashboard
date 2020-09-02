const Page = require('core/pages/page');
const config = require('config');
const moment = require('moment');
const Milestone = require('models/milestone');
const Project = require('models/project');
const authentication = require('services/authentication');

class MissedMilestones extends Page {
  static get isEnabled() {
    return config.features.missedMilestones;
  }

  get url() {
    return config.paths.missedMilestones;
  }

  get middleware() {
    return [
      ...authentication.protect(['management'])
    ];
  }

  async getDepartmentsWithMissedMilestones() {
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
    return [{ title:'Project Impact', id: 'impact' }];
  }

  get milestoneFields() {
    return [{ title:'Milestone UID', id: 'uid' }, { title:'Milestone Description', id: 'description' }, { title:'Due Date', id: 'date' }, { title:'Milestone Delivery Confidence', id: 'deliveryConfidence' }];
  }
}

module.exports = MissedMilestones;