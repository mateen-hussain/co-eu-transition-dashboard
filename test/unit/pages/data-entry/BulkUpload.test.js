const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const proxyquire = require('proxyquire');
const flash = require('middleware/flash');
const jwt = require('services/jwt');

const fileUploadMock = sinon.stub();
fileUploadMock.returns(fileUploadMock);

const BulkUpload = proxyquire('pages/data-entry/bulk-upload/BulkUpload', {
  'express-fileupload': fileUploadMock
});

let page = {};
let req = {};
let res = {};

describe('pages/data-entry/bulk-upload/BulkUpload', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub() };
    req = { cookies: [] };

    page = new BulkUpload('some path', req, res);

    sinon.stub(jwt, 'restoreData');

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    jwt.restoreData.restore();
    authentication.protect.restore();
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(paths.dataEntry.bulkUpload);
  });

  it('only uploaders are allowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['uploader']),
      fileUploadMock,
      flash
    ]);

    sinon.assert.calledWith(authentication.protect, ['uploader']);
  });

  describe('#mode', () => {
    it('current mode to be bulk-upload', () => {
      page.req.path = '/project-milestone';
      expect(page.mode).to.eql('bulk-upload');
    });

    it('current mode to be sign-off', () => {
      page.req.path = '/sign-off';
      expect(page.mode).to.eql('sign-off');
    });

    it('current mode to be upload-file', () => {
      page.req.path = '/upload-file';
      expect(page.mode).to.eql('upload-file');
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();
    });

    it('redirects back to upload page if no file provided', async () => {
      await page.postRequest(req, res);
      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.bulkUpload);
    });

    it('calls import data function if file provided', async () => {
      sinon.stub(page, 'importData').resolves();
      page.req.files = {};
      await page.postRequest(req, res);
      sinon.assert.called(page.importData);
    });
  });
});
