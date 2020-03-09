const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const sequelize = require('sequelize');
const proxyquire = require('proxyquire');
const Projects = require('models/projects');
const Milestone = require('models/milestones');
const moment = require('moment');

let page = {};
let filtersStub = {};

describe('pages/all-data/AllData', () => {
  beforeEach(() => {
    filtersStub = sinon.stub();
    const AllData = proxyquire('pages/all-data/AllData', {
      'helpers': {
        filters: filtersStub
      }
    });

    const res = { cookies: sinon.stub() };
    const req = { cookies: [] };

    page = new AllData('some path', req, res);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(paths.allData);
  });

  it('returns the project search criteria formatted for database', () => {
    const data = { AllData: { filters: { projects: { 'test': ['test1', 'test2'] } } } };
    jwt.restoreData.returns(data);

    const shouldEql = { test: { [sequelize.Op.or]: [ 'test1', 'test2' ] } };
    expect(page.search.projects).to.eql(shouldEql);
  });

  it('returns the milestone search criteria formatted for database', () => {
    const data = { AllData: { filters: { milestones: { 'test': ['test1', 'test2'] } } } };
    jwt.restoreData.returns(data);

    const shouldEql = { test: { [sequelize.Op.or]: [ 'test1', 'test2' ] } };
    expect(page.search.milestones).to.eql(shouldEql);
  });

  it('returns projects from database', async () => {
    await page.projects();

    return sinon.assert.calledWith(Projects.findAll, {
      where: page.search.projects,
      include: [{
        model: Milestone,
        where: page.search.milestones
      }]
    });
  });

  it('should call the filters helper function', async () => {
    await page.filters();
    return sinon.assert.calledWith(filtersStub, page.search);
  });

  it('should return the current date', () => {
    expect(page.currentDate).to.eql(moment().format());
  });
});
