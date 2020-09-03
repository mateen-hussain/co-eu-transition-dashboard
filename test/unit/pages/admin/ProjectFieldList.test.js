const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const ProjectFieldList = require('pages/admin/project-field-list/ProjectFieldList');
const ProjectField = require('models/projectField');
const FieldEntryGroup = require('models/fieldEntryGroup');
const authentication = require('services/authentication');
const flash = require('middleware/flash');

let page = {};
let req = {};
let res = {};

describe('pages/admin/project-field-list/ProjectFieldList', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), redirect: sinon.stub() };
    req = { cookies: [], user: { getDepartmentsWithProjects: sinon.stub() } };

    page = new ProjectFieldList('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.projectFieldList);
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

  describe('#pathToBind', () => {
    it('returns correct url with params', () => {
      expect(page.pathToBind).to.eql(`${paths.admin.projectFieldList}/:editMode(edit)?`);
    });
  });

  describe('#postRequest', () => {
    it('redirects when fields send for ordering', async () => {
      page.req.body = { fields: [ { order: ['1,2,3'], id: ['1,2,3'] } ], submit: '' };
      await page.postRequest(req, res);
      sinon.assert.called(page.res.redirect);
    });
  });

  describe('#middleware', () => {
    it('only admins are alowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });
});
