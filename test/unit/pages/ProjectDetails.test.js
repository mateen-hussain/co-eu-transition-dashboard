const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const moment = require('moment');
const ProjectField = require('models/projectField');
const FieldEntryGroup = require('models/fieldEntryGroup');

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

  describe('#currentDate', () => {
    it('should return the current date', () => {
      expect(page.currentDate).to.eql(moment().format('YYYY-MM-DD'));
    });
  });

  describe('#project', () => {
    it('gets single projects for users', async () => {
      getProject.resolves('some response');
      const project = await page.project();
      expect(project).to.eql('some response');
    });
  });

  describe('#getFields', () => {
    it('gets all project fields', async () => {
      await page.getFields();
      sinon.assert.called(ProjectField.findAll);
    });
  });

  describe('#getProjectGroups', () => {
    it('gets all project groups', async () => {
      await page.getProjectGroups();
      sinon.assert.called(FieldEntryGroup.findAll);
    })
  });
});
