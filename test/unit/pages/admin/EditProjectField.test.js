const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');

const EditProjectField = require('pages/admin/edit-project-field/EditProjectField');

let page = {};
let res = {};
let req = {};

describe('pages/admin/edit-project-field/EditProjectField', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), render: sinon.stub() };
    req = { cookies: [], user: {} };
    page = new EditProjectField('some path', req, res);

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
      expect(page.pathToBind).to.eql(`${paths.admin.projectField}/:id(\\d+)?/:summary(summary)?`);
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
});



