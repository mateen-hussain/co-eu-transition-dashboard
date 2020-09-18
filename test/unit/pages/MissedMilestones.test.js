const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const MissedMilestones = require('pages/missed-milestones/MissedMilestones');
const Milestone = require('models/milestone');
const Project = require('models/project');
const config = require('config');
const moment = require('moment');
const authentication = require('services/authentication');

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

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#isEnabled', () => {
    let sandbox = {};
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be enabled if missedMilestones feature is active', () => {
      sandbox.stub(config, 'features').value({
        missedMilestones: true
      });

      expect(MissedMilestones.isEnabled).to.be.ok;
    });

    it('should be enabled if missedMilestones feature is active', () => {
      sandbox.stub(config, 'features').value({
        missedMilestones: false
      });

      expect(MissedMilestones.isEnabled).to.not.be.ok;
    })
  })

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.missedMilestones);
    });
  });

  it('only management are allowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['management'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['management']);
  });

  describe('#getDepartmentsWithMissedMilestones', () => {
    const departments = [{
      id: 1,
      projects: [{
        milestones: [{ id: 1, date: '13-06-2020' },{ id: 2, date: '10-05-2020' },{ id: 3, date: '05-04-2020' }]
      },{
        milestones: [{ id: 1, date: '15-06-2020' }]
      }]
    },{
      id: 2,
      projects: [{
        milestones: [{ id: 1, date: '13-06-2020' }, { id: 2, date: '15-04-2020' }, { id: 3, date: '01-01-2020' }]
      },{
        milestones: [{ id: 1, date: '06-06-2020' }, { id: 2, date: '25-08-2020' }, { id: 3, date: '04-04-2020' }]
      }]
    }];

    let departmentsWithMissedMilestones = {};

    beforeEach(async () => {
      sinon.stub(page, 'totalMilestones').returns(5);

      req.user.getDepartmentsWithProjects.returns(departments);
      departmentsWithMissedMilestones = await page.getDepartmentsWithMissedMilestones();
    });

    it('calls #req.user.getDepartmentsWithProjects with correct parameters', () => {
      sinon.assert.calledWith(req.user.getDepartmentsWithProjects, {
        date: { to: moment().subtract(1, 'days').format('DD/MM/YYYY') },
        complete: ['No'],
        impact: [0, 1]
      });
    });

    it('adds total milestones to each department', () => {
      expect(departmentsWithMissedMilestones.departments[0].totalMilestones).to.eql(5);
      expect(departmentsWithMissedMilestones.departments[1].totalMilestones).to.eql(5);
    });

    it('sorts departments based on total missed milestones', () => {
      expect(departmentsWithMissedMilestones.departments[0].id).to.eql(2);
      expect(departmentsWithMissedMilestones.departments[1].id).to.eql(1);
    });

    it('adds up total missed milestones', () => {
      expect(departmentsWithMissedMilestones.departments[0].totalMilestonesMissed).to.eql(6);
      expect(departmentsWithMissedMilestones.departments[1].totalMilestonesMissed).to.eql(4);
    });

    it('sorts milestones based on due date', () => {
      expect(departmentsWithMissedMilestones.milestones[0].id).to.eql(2);
      expect(departmentsWithMissedMilestones.milestones[1].id).to.eql(1);
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
    it('should return an object of project id, title and impact', () => {
      expect(page.project).to.eql({ 
        uid: { id: 'uid' },
        name: { title:'Project name', id: 'title' },
        impact: { title:'Project impact', id: 'impact' }
      });
    });
  });

  describe('#milestoneFields', () => {
    it('should return an array of milestone id and title', () => {
      expect(page.milestoneFields).to.eql([{ title:'Milestone UID', id: 'uid' }, { title:'Due Date', id: 'date' }, { title:'Milestone Description', id: 'description' }, { title:'Milestone Delivery Confidence', id: 'deliveryConfidence' }]);
    });
  });

  describe('#chartData', () => {
    it('should return chart data when passed in department', () => {
      expect(page.chartData(department)).to.eql( { data: [3], labels: [undefined], meta: [ { totalMilestones: 5, totalMilestonesMissed: 3 }] });
    });
  });
});

