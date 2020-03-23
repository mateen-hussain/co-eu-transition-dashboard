const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');

let page = {};
let getProject = {};
let params = {};

describe('pages/project-details/ProjectDetails', () => {
  beforeEach(() => {
    params = sinon.stub();
    const ProjectDetails = proxyquire('pages/project-details/ProjectDetails', {
        params
    });

    const res = { cookies: sinon.stub() };

    getProject = sinon.stub();

    const req = { cookies: [], user: { getProject }, params };

    page = new ProjectDetails('some path', req, res);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.projectDetails);
    });
  });

  describe('#project', () => {
    it('gets single projects for users', async () => {
      getProject.resolves('some response');
      const project = await page.project();
      expect(project).to.eql('some response');
    });
  });
});
