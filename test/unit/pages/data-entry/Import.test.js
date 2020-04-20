const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const proxyquire = require('proxyquire');
const flash = require('middleware/flash');

const fileUploadMock = sinon.stub();
fileUploadMock.returns(fileUploadMock);

const Import = proxyquire('pages/data-entry/import/Import', {
  'express-fileupload': fileUploadMock
});

let page = {};
let req = {};
let res = {};

describe('pages/data-entry/import/Import', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub() };
    req = { cookies: [] };

    page = new Import('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(paths.dataEntry.import);
  });

  it('only admins are alowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['admin']),
      fileUploadMock,
      flash
    ]);

    sinon.assert.calledWith(authentication.protect, ['admin']);
  });

  describe('#postRequest', () => {
    it('cancels the import if the user requests', async () => {
      sinon.stub(page, 'cancelImport').resolves();
      page.req.body = { cancel: 'cancel', importId: '123' };
      await page.postRequest(req, res);
      sinon.assert.called(page.cancelImport);  
    });

    it('imports the file to the system', async () => {
      sinon.stub(page, 'finaliseImport').resolves();
      page.req.body = { import: 'import', importId: '123' };
      await page.postRequest(req, res);
      sinon.assert.called(page.finaliseImport);  
    });
  });
});
