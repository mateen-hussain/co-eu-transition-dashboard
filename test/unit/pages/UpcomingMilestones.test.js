const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');

let page = {};
let getDepartmentsWithProjects = {};

const departments = [{
  dataValues: {
    name: 'department',
    projects: ['project 1'],
    departmentUser: ['departmentUser']
  },
  projects: [{
    project: {
      milestones: ['milestone 1'],
    },
  }],
}]

describe('pages/upcoming-milestones/UpcomingMilestones', () => {
  beforeEach(() => {
    const UpcomingMilestones = require('pages/upcoming-milestones/UpcomingMilestones');

    const res = { cookies: sinon.stub() };

    getDepartmentsWithProjects = sinon.stub();

    const req = { cookies: [], user: { getDepartmentsWithProjects } };

    page = new UpcomingMilestones('some path', req, res);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.upcomingMilestones);
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

  describe('#getProjectsFromDepartments', () => {
    it('should get projects from departments', () => {
      expect(page.getProjectsFromDepartments(departments)).to.eql([{ project: { milestones: [ 'milestone 1'] } } ]);
    });
  });
});

