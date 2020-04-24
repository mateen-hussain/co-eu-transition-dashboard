const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const ProjectFieldList = require('pages/admin/project-field-list/ProjectFieldList');
const ProjectField = require('models/projectField');
const FieldEntryGroup = require('models/fieldEntryGroup');

let page = {};
let req = {};
let res = {};

describe.only('pages/admin/project-field-list/ProjectFieldList', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub() };
    req = { cookies: [], user: { getDepartmentsWithProjects: sinon.stub() } };

    page = new ProjectFieldList('some path', req, res);
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
});
