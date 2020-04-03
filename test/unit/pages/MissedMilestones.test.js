const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const moment = require('moment');
const MissedMilestones = require('pages/missed-milestones/MissedMilestones');
const Milestone = require('models/milestone');
const Project = require('models/project');

const department = [{
  dataValues: {
    name: 'department',
    projects: [ ['project1'], ['project2'] ],
    departmentUser: ['departmentUser']
  },
  projects: [ ['project1'], ['project2'] ],
  totalMilestones: 5,
  totalMilestonesMissed: 3
}]

let page = {};
let res = {};
let req = {};

describe('pages/missed-milestones/MissedMilestones', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub() };
    req = { cookies: [], user: { getDepartmentsWithProjects: sinon.stub() } };

    page = new MissedMilestones('some path', req, res);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.missedMilestones);
    });
  });

  describe('#getDepartmentsWithMissedMilestones', () => {
    const departments = [{
      id: 1,
      projects: [{
        milestones: [{},{},{}]
      },{
        milestones: [{}]
      }]
    },{
      id: 2,
      projects: [{
        milestones: [{}, {}, {}]
      },{
        milestones: [{}, {}, {}]
      }]
    }];

    let departmentsWithMissedMilestones = {};

    before(async () => {
      sinon.stub(page, 'totalMilestones').returns(5);

      req.user.getDepartmentsWithProjects.returns(departments);
      departmentsWithMissedMilestones = await page.getDepartmentsWithMissedMilestones();
    });

    it('adds total milestones to each department', () => {
      expect(departmentsWithMissedMilestones[0].totalMilestones).to.eql(5);
      expect(departmentsWithMissedMilestones[1].totalMilestones).to.eql(5);
    });

    it('sorts departments based on total missed milestones', () => {
      expect(departmentsWithMissedMilestones[0].id).to.eql(2);
      expect(departmentsWithMissedMilestones[1].id).to.eql(1);
    });

    it('adds up total missed milestones', () => {
      expect(departmentsWithMissedMilestones[0].totalMilestonesMissed).to.eql(6);
      expect(departmentsWithMissedMilestones[1].totalMilestonesMissed).to.eql(4);
    });
  });

  describe('#totalMilestones', () => {
    it('calls Milestone.count with correct parameters and returns correct response', async () => {
      Milestone.count.resolves(5);

      const count = await page.totalMilestones({ name: 'BEIS' });

      sinon.assert.calledWith(Milestone.count, {
        include: [{
          attributes: [],
          model: Project,
          where: { departmentName: 'BEIS' },
          required: true
        }]
      });

      expect(count).to.eql(5);
    });
  });

  describe('#projectFields', () => {
    it('should return an array of project id and title', () => {
      expect(page.projectFields).to.eql([{ title:'Project UID', id: 'uid' }, { title:'Project Name', id: 'title' }, { title:'Impact', id: 'impact' }, { title:'HMG Confidence', id: 'hmgConfidence' }, { title:'Citizen Readiness', id: 'citizenReadiness' }, { title:'Business Readiness', id: 'businessReadiness' }, { title:'EU Member State Delivery Confidence', id: 'euStateConfidence' }]);
    });
  });

  describe('#milestoneFields', () => {
    it('should return an array of milestone id and title', () => {
      expect(page.milestoneFields).to.eql([{ title:'Milestone UID', id: 'uid' }, { title:'Milestone Description', id: 'description' }, { title:'Due Date', id: 'date' }, { title:'Latest Comments', id: 'comment' }]);
    });
  });

  describe('#chartData', () => {
    it('should return chart data when passed in department', () => {
      expect(page.chartData(department)).to.eql( { data: [3], labels: [undefined], meta: [ { totalMilestones: 5, totalMilestonesMissed: 3 }] });
    });
  });
});

