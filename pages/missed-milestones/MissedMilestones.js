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
      date: { to: moment().subtract(1, 'days').format('DD/MM/YYYY') }
      // complete: ['No'],
      // impact: [0, 1]
    });

    const milestones = [];

    for(const department of departments) {
      department.totalMilestones = await this.totalMilestones(department);
      department.totalMilestonesMissed = department.projects.reduce((total, project) => {
        return total + project.milestones.length;
      }, 0);

      department.projects.forEach(project => {
        project.milestones.forEach(milestone => {
          milestone.project = project;
        });
        milestones.push(...project.milestones)
      });
    }

    return {
      departments: departments.sort((a, b) => (a.totalMilestonesMissed < b.totalMilestonesMissed) ? 1 : -1),
      milestones: milestones.sort((a, b) => moment(b.date, 'DD-MM-YYYY').valueOf() - moment(a.date, 'DD-MM-YYYY').valueOf())
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

  get projectTitle() {
    return { title:'Project name', id: 'title' };
  }

  get projectImpact() {
    return { title:'Project impact', id: 'impact' };
  }

  get milestoneFields() {
    return [{ title:'Milestone UID', id: 'uid' }, { title:'Due Date', id: 'date' }, { title:'Milestone Description', id: 'description' }, { title:'Milestone Delivery Confidence', id: 'deliveryConfidence' }];
  }
}

module.exports = MissedMilestones;