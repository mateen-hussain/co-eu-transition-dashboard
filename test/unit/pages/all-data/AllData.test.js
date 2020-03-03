const AllData = require('pages/all-data/AllData');
const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const projects = require('models/projects');

const projectsSample = [{
  name: 'name'
}];

let page = {};
describe('pages/all-data/AllData', () => {
  beforeEach(() => {
    const res = { cookies: sinon.stub() };
    const req = { cookies: [] };
    page = new AllData('some path', req, res);
    sinon.stub(projects, 'getProjects').resolves(projectsSample);
  })

  afterEach(() => {
    projects.getProjects.restore();
  })

  it('returns correct url', () => {
    expect(page.url).to.eql(paths.allData);
  });

  it('returns projects from database', async () => {
    return expect(page.projects()).to.eventually.eql(projectsSample);
  });
});
