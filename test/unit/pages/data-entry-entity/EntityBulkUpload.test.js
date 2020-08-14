const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');
const authentication = require('services/authentication');
const proxyquire = require('proxyquire');
const flash = require('middleware/flash');
const jwt = require('services/jwt');

const fileUploadMock = sinon.stub();
fileUploadMock.returns(fileUploadMock);

const EntityBulkUpload = proxyquire('pages/data-entry-entity/entity-bulk-upload/EntityBulkUpload', {
  'express-fileupload': fileUploadMock
});

let page = {};
let req = {};
let res = {};

describe('pages/data-entry-entity/entity-bulk-upload/EntityBulkUpload', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), sendStatus: sinon.stub() };
    req = { cookies: [] };

    page = new EntityBulkUpload('some path', req, res);

    sinon.stub(jwt, 'restoreData');

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    jwt.restoreData.restore();
    authentication.protect.restore();
  });

  describe('#isEnabled', () => {
    let sandbox = {};
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be enabled if entityData feature is active', () => {
      sandbox.stub(config, 'features').value({
        entityData: true
      });

      expect(EntityBulkUpload.isEnabled).to.be.ok;
    });

    it('should be enabled if missedMilestones feature is active', () => {
      sandbox.stub(config, 'features').value({
        entityData: false
      });

      expect(EntityBulkUpload.isEnabled).to.not.be.ok;
    })
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(config.paths.dataEntryEntity.bulkUpload);
  });

  it('only admins are alowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['admin']),
      fileUploadMock,
      flash
    ]);

    sinon.assert.calledWith(authentication.protect, ['admin']);
  });

  describe('#mode', () => {
    it('current mode to be bulk-upload', () => {
      page.req.path = '/entity';
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
      page.req.path = '/upload-file';
      page.req.flash = sinon.stub();
      page.res.redirect = sinon.stub();
    });

    it('redirects back to upload page if no file provided', async () => {
      await page.postRequest(req, res);
      sinon.assert.calledWith(page.res.redirect, config.paths.dataEntryEntity.bulkUpload);
    });

    it('calls import data function if file provided', async () => {
      sinon.stub(page, 'importData').resolves();
      page.req.files = {};
      page.req.body = { category: 'somecategory' };
      await page.postRequest(req, res);
      sinon.assert.called(page.importData);
    });
  });
});
