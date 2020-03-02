const AllData = require('pages/all-data/AllData');
const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const database = require('services/database');

const projectsSample = [{
  name: 'name'
}];

let page = {};
describe('pages/all-data/AllData', () => {
  beforeEach(() => {
    page = new AllData();
    sinon.stub(database, 'getProjects').resolves(projectsSample);
  })

  afterEach(() => {
    database.getProjects.restore();
  })

  it('returns correct url', () => {
    expect(page.url).to.eql(paths.allData);
  });

  it('returns projects from database', async () => {
    return expect(page.projects()).to.eventually.eql(projectsSample);
  });
});
