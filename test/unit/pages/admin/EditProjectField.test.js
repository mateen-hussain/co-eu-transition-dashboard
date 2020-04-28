const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const ProjectField = require('models/projectField');
const FieldEntryGroup = require('models/fieldEntryGroup');
const EditProjectField = require('pages/admin/edit-project-field/EditProjectField');

let page = {};
let res = {};
let req = {};

describe('pages/admin/edit-project-field/EditProjectField', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), render: sinon.stub(), redirect: sinon.stub() };
    req = { cookies: [], user: {} };
    page = new EditProjectField('some path', req, res);
    page.req = req;
    page.res = res;

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.projectField);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url with params', () => {
      expect(page.pathToBind).to.eql(`${paths.admin.projectField}/:id(\\d+)?/:summary(summary)?/:successful(successful)?`);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });

  describe('#editMode', () => {
    it('returns true when in edit mode', () => {
      page.req.params = { id: 'someid' };
      expect(page.editMode).to.be.ok;
    });

    it('returns false when not in edit mode', () => {
      expect(page.editMode).to.be.not.ok;
    });
  });

  describe('#summaryMode', () => {
    it('returns true when in summary mode', () => {
      page.req.params = { summary: 'summary' };
      expect(page.summaryMode).to.be.ok;
    });

    it('returns false when not in summary mode', () => {
      expect(page.summaryMode).to.be.not.ok;
    });
  });

  describe('#getRequest', () => {
    it('runs setdata function', async () => {
      page.setData = sinon.stub().resolves();

      await page.getRequest(req, res);

      sinon.assert.called(page.setData)
    });
  });

  describe('#next', () => {
    it('redirects to successful page if in summary mode and new field', async () => {
      page.req.params = { summary: 'summary' };
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/successful`);
    });

    it('redirects to successful page if in summary mode and editing field', async () => {
      page.req.params = { summary: 'summary', id: 'someid' };
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/someid/successful`);
    });

    it('redirects to summary page if editing field', async () => {
      page.req.params = { id: 'someid' };
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/someid/summary`);
    });

    it('redirects to summary page if adding field', async () => {
      page.req.params = {};
      page.next();
      sinon.assert.calledWith(res.redirect, `${page.url}/summary`);
    });
  });

  describe('#saveFieldToDatabase', () => {
    it('saves any edits to database', async () => {
      page.clearData = sinon.stub();
      page.next = sinon.stub();
      page.data = { id: 1, foo: 'bar', displayName: 'some name' };
      await page.saveFieldToDatabase();

      sinon.assert.calledWith(ProjectField.upsert, page.data);
      sinon.assert.calledOnce(page.next);
      sinon.assert.calledOnce(page.clearData);
    });

    it('catches any errors and returns to user', async () => {
      const error = new Error('some error');
      ProjectField.upsert.throws(error);

      page.req.flash = sinon.stub();
      page.req.originalUrl = 'someurl';

      await page.saveFieldToDatabase();

      sinon.assert.calledWith(req.flash, `Error when creating / editing field: Error: some error`);
      sinon.assert.calledWith(res.redirect, page.req.originalUrl);
    });
  });

  describe.only('#isValid', () => {
    let body = {};

    beforeEach(() => {
      body = {
        type: 'some text',
        displayName: 'some text',
        importColumnName: 'some text',
        description: 'some text'
      }
    });

    it('returns true if all valid', () => {
      expect(page.isValid(body)).to.be.ok;
    });

    it('returns false if no display name', () => {
      body.displayName = '';
      expect(page.isValid(body)).to.not.be.ok;
    });

    it('returns false if no importColumnName', () => {
      body.importColumnName = '';
      expect(page.isValid(body)).to.not.be.ok;
    });

    it('returns false if no description', () => {
      body.description = '';
      expect(page.isValid(body)).to.not.be.ok;
    });

    it('returns true if type is group and valid options', () => {
      body.type = 'group';
      body.config = { options: ['1', '2', '3'] };
      expect(page.isValid(body)).to.be.ok;
    });

    it('returns false if type is group no valid options', () => {
      body.type = 'group';
      body.config = { options: [''] };
      expect(page.isValid(body)).to.not.be.ok;
    });
  })

  describe('#setData', () => {
    beforeEach(() => {
      sinon.stub(page, 'saveData');
      sinon.stub(page, 'clearData');
    });

    it('sets data if in edit mode', async () => {
      page.req.params = { id: 'someid' };
      ProjectField.findOne.returns({ foo: 'bar' });

      await page.setData();

      sinon.assert.calledWith(page.saveData, { foo: 'bar' });
      sinon.assert.notCalled(page.clearData);
    });

    it('does not set data id is set in data', async () => {
      await page.setData();

      sinon.assert.notCalled(page.saveData);
      sinon.assert.calledOnce(page.clearData);
    });
  });

  describe('#getProjectGroups', () => {
    it('gets all project groups', async () => {
      await page.getProjectGroups();
      sinon.assert.called(FieldEntryGroup.findAll);
    })
  });
});